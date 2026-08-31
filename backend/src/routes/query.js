const express = require('express');
const logger = require('../utils/logger');
const transactionStore = require('../services/transaction-store');
const { fromCents } = require('../utils/amount');
const { validateApiKey } = require('../services/merchant-config');
const { getGatewayForLocation } = require('../services/gateway-resolver');
const locationStore = require('../services/location-store');

function createQueryRoutes(defaultGateway, config) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const { type } = req.body;

    const auth = validateApiKey(req.body, config);
    if (!auth.valid) {
      return res.status(401).json({ error: auth.reason });
    }

    const location = auth.location || locationStore.getLocation(req.body.locationId);
    const gateway = location
      ? getGatewayForLocation(location, inferMode(req.body))
      : defaultGateway;

    try {
      switch (type) {
        case 'verify':
          return res.json(await handleVerify(req.body, gateway));
        case 'refund':
          return res.json(await handleRefund(req.body, gateway));
        case 'list_payment_methods':
          return res.json(await handleListPaymentMethods(req.body));
        case 'charge_payment':
          return res.json(await handleChargePayment(req.body, gateway));
        case 'create_subscription':
          return res.json(await handleCreateSubscription(req.body));
        case 'cancel_subscription':
          return res.json(await handleCancelSubscription(req.body));
        default:
          return res.status(400).json({ error: `Unknown query type: ${type}` });
      }
    } catch (err) {
      logger.error({ type, err: err.message }, 'queryUrl handler failed');
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

function inferMode(body) {
  const loc = locationStore.findByApiKey(body.apiKey);
  if (!loc) return 'test';
  if (loc.keys?.live?.apiKey === body.apiKey) return 'live';
  return 'test';
}

async function handleVerify(body, gateway) {
  const { chargeId, transactionId } = body;
  const tx =
    transactionStore.findByRetref(chargeId) ||
    transactionStore.findByGhlTransactionId(transactionId);

  if (!tx) {
    const inquiry = await gateway.inquire({ retref: chargeId });
    const approved = gateway.isApproved(inquiry);
    return {
      success: approved,
      failed: !approved,
      chargeSnapshot: approved
        ? buildChargeSnapshot(chargeId, inquiry.amount, 'succeeded')
        : undefined,
    };
  }

  const approved = tx.status === 'captured' || tx.status === 'authorized';
  return {
    success: approved,
    failed: tx.status === 'failed',
    chargeSnapshot: approved
      ? buildChargeSnapshot(tx.retref, tx.amount, 'succeeded')
      : undefined,
  };
}

async function handleRefund(body, gateway) {
  const { chargeId, amount, transactionId } = body;
  const tx =
    transactionStore.findByRetref(chargeId) ||
    transactionStore.findByGhlTransactionId(transactionId);

  const retref = tx?.retref || chargeId;
  const result = await gateway.refund({ retref, amount });

  const success = gateway.isApproved(result);
  transactionStore.update(retref, { status: success ? 'refunded' : tx?.status, processorResponse: result });

  return {
    success,
    message: result.resptext || (success ? 'Refund successful' : 'Refund failed'),
    id: result.retref,
    amount: amount || (tx?.amount ? fromCents(tx.amount) : 0),
    currency: tx?.currency || 'USD',
  };
}

async function handleListPaymentMethods(_body) {
  // CardPointe profiles — implement when vault/profile API is wired
  return [];
}

async function handleChargePayment(body, gateway) {
  const { paymentMethodId, amount, currency, transactionId, contactId, locationId } = body;
  const idempotencyKey = `charge-${transactionId}`;

  const result = await gateway.authorize(
    {
      token: paymentMethodId,
      amount,
      currency,
      capture: 'Y',
      contactId,
      locationId,
      ghlTransactionId: transactionId,
    },
    idempotencyKey
  );

  const record = gateway.mapToTransactionRecord(result, {
    amount,
    currency,
    contactId,
    locationId,
    ghlTransactionId: transactionId,
  });
  transactionStore.save(record);

  const success = gateway.isApproved(result);
  return {
    success,
    failed: !success,
    chargeId: gateway.getChargeId(result),
    message: result.resptext,
    chargeSnapshot: success
      ? buildChargeSnapshot(gateway.getChargeId(result), record.amount, 'succeeded')
      : undefined,
  };
}

async function handleCreateSubscription(_body) {
  return {
    success: false,
    failed: true,
    message: 'Subscriptions not yet implemented — Shalinder track',
  };
}

async function handleCancelSubscription(_body) {
  return { status: 'canceled' };
}

function buildChargeSnapshot(chargeId, amountCents, status) {
  return {
    id: chargeId,
    status,
    amount: typeof amountCents === 'number' && amountCents > 100 ? amountCents : amountCents * 100,
    chargeId,
    chargedAt: Math.floor(Date.now() / 1000),
  };
}

module.exports = { createQueryRoutes };
