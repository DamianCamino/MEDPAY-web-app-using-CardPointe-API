const express = require('express');
const path = require('path');
const logger = require('../utils/logger');
const transactionStore = require('../services/transaction-store');
const { resolveCardPointeConfig, resolvePaymentContext } = require('../services/merchant-config');
const { getGatewayForLocation } = require('../services/gateway-resolver');
const { sendPaymentCaptured } = require('../services/ghl-webhook-sender');
const { toCents } = require('../utils/amount');

function createCheckoutRoutes(defaultGateway, config) {
  const router = express.Router();

  router.get('/config', (req, res) => {
    const { locationId, publishableKey, method } = req.query;
    const ctx = resolvePaymentContext({ locationId, publishableKey });
    const cardpointe = ctx.location
      ? resolveCardPointeConfig(ctx.location, ctx.mode === 'live' ? 'prod' : 'uat')
      : config.cardpointe;

    const params = new URLSearchParams({
      useexpiry: 'true',
      usecvv: 'true',
      tokenizewheninactive: 'true',
      inactivityto: '3000',
    });

    // ACH mode: per CardPointe's Hosted iFrame Tokenizer docs, ACH uses the
    // SAME account-number field as a card — the user types
    // "RoutingNumber/AccountNumber" into it. fullmobilekeyboard lets mobile
    // users type the "/" separator. There is no separate "ACH mode" flag.
    // (See: https://developer.cardpointe.com/hosted-iframe-tokenizer)
    if (method === 'bank') {
      params.set('useexpiry', 'false');
      params.set('usecvv', 'false');
      params.set('fullmobilekeyboard', 'true');
    }

    res.json({
      env: cardpointe.env,
      site: cardpointe.site,
      tokenizerUrl: `${cardpointe.tokenizerUrl}?${params}`,
      currency: 'USD',
      mode: ctx.mode,
      locationId: ctx.location?.locationId || null,
    });
  });

  router.post('/pay', async (req, res) => {
    const {
      token,
      account,
      expiry,
      accttype,
      achEntryCode,
      achDescription,
      postal,
      amount,
      currency = 'USD',
      capture = 'Y',
      orderId,
      transactionId,
      locationId,
      publishableKey,
      contactId,
      contact,
      mode: modeOverride,
    } = req.body;

    const cardToken = token || account;
    if (!cardToken || amount == null) {
      return res.status(400).json({ error: 'token and amount are required' });
    }

    const ctx = resolvePaymentContext({ locationId, publishableKey });
    const mode = modeOverride || ctx.mode;
    const gateway = ctx.location ? getGatewayForLocation(ctx.location, mode) : defaultGateway;
    const resolvedLocationId = ctx.location?.locationId || locationId;

    const idempotencyKey = transactionId ? `checkout-${transactionId}` : undefined;

    try {
      const result = await gateway.authorize(
        {
          token: cardToken,
          expiry,
          accttype,
          achEntryCode,
          achDescription,
          amount,
          currency,
          capture,
          name: contact?.name,
          postal: postal || contact?.postalCode,
          contactId: contactId || contact?.id,
          locationId: resolvedLocationId,
          ghlTransactionId: transactionId,
          orderId,
        },
        idempotencyKey
      );

      const record = gateway.mapToTransactionRecord(result, {
        amount,
        currency,
        capture,
        contactId: contactId || contact?.id,
        locationId: resolvedLocationId,
        ghlTransactionId: transactionId,
        orderId,
      });
      transactionStore.save(record);

      const approved = gateway.isApproved(result);
      if (!approved) {
        return res.status(402).json({
          approved: false,
          error: result.resptext || 'Payment declined',
          respcode: result.respcode,
          chargeId: gateway.getChargeId(result),
        });
      }

      const chargeId = gateway.getChargeId(result);

      if (resolvedLocationId && transactionId) {
        sendPaymentCaptured({
          locationId: resolvedLocationId,
          chargeId,
          ghlTransactionId: transactionId,
          amountCents: Number(toCents(amount)),
          mode,
        });
      }

      res.json({
        approved: true,
        chargeId,
        retref: result.retref,
        authcode: result.authcode,
        resptext: result.resptext,
      });
    } catch (err) {
      logger.error({ err: err.message, transactionId }, 'checkout pay failed');
      const status = err.code === 'TIMEOUT_UNKNOWN' ? 504 : err.response?.status || 500;
      res.status(status).json({ error: err.message, retref: err.retref });
    }
  });

  router.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../public/checkout/index.html'));
  });

  return router;
}

module.exports = { createCheckoutRoutes };
