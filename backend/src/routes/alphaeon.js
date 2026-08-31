const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');
const locationStore = require('../services/location-store');
const { resolveAlphaeonConfig, resolvePaymentContext } = require('../services/merchant-config');
const { requireLocationSession } = require('../middleware/require-location-session');
const transactionStore = require('../services/transaction-store');
const { sendPaymentCaptured } = require('../services/ghl-webhook-sender');

function createAlphaeonRoutes() {
  const router = express.Router();

  // --- Public: called from the checkout iframe before mounting the Alphaeon
  // credit-portal iframe. Returns ONLY what the browser needs (iframe URL +
  // a fresh tracking guid) — clientId/clientSecret never leave the backend.
  router.get('/session', (req, res) => {
    const { locationId, publishableKey, mode } = req.query;
    const ctx = resolvePaymentContext({ locationId, publishableKey });
    const resolvedMode = mode || ctx.mode || 'test';

    const alphaeon = ctx.location
      ? resolveAlphaeonConfig(ctx.location, resolvedMode === 'live' ? 'live' : 'test')
      : resolveAlphaeonConfig(null, 'test');

    const partnerTrackingGuid = crypto.randomUUID();

    res.json({
      env: alphaeon.env,
      iframeBaseUrl: alphaeon.iframeBaseUrl,
      merchantId: alphaeon.merchantId,
      partnerTrackingGuid,
      locationId: ctx.location?.locationId || locationId || null,
    });
  });

  // --- Protected: clinic admin saves their Alphaeon client_id / client_secret
  // / merchant_id, same session-token protection as CardPointe config.
  router.post('/locations/:locationId/config', requireLocationSession, (req, res) => {
    const { locationId } = req.params;
    const loc = locationStore.getLocation(locationId);

    if (!loc) {
      return res.status(404).json({ error: 'Location not found — install app first' });
    }

    const { prod, sandbox } = req.body;

    function validCreds(c) {
      return c && c.clientId && c.clientSecret && c.merchantId;
    }

    if (!validCreds(prod) && !validCreds(sandbox)) {
      return res.status(400).json({
        error: 'Provide complete credentials (clientId, clientSecret, merchantId) for at least Production or Sandbox',
      });
    }

    const alphaeon = { ...(loc.alphaeon || { test: null, live: null }) };
    if (validCreds(sandbox)) {
      alphaeon.test = {
        clientId: sandbox.clientId,
        clientSecret: sandbox.clientSecret,
        merchantId: sandbox.merchantId,
      };
    }
    if (validCreds(prod)) {
      alphaeon.live = {
        clientId: prod.clientId,
        clientSecret: prod.clientSecret,
        merchantId: prod.merchantId,
      };
    }

    const updated = locationStore.updateLocation(locationId, { alphaeon });

    logger.info({ locationId }, 'Alphaeon config (prod/sandbox) saved');
    res.json({
      success: true,
      locationId,
      hasAlphaeonTestConfig: Boolean(updated.alphaeon?.test?.clientId),
      hasAlphaeonLiveConfig: Boolean(updated.alphaeon?.live?.clientId),
    });
  });

  // --- Public: the frontend reports terminal Alphaeon iframe events here
  // (credit_decision / receipt_signed) so we can record the outcome the same
  // way /checkout/pay records a card transaction. Alphaeon's own iframe is
  // the source of truth for the decision itself — this just persists it.
  router.post('/events', async (req, res) => {
    const {
      eventType,
      locationId,
      publishableKey,
      orderId,
      transactionId,
      amount,
      currency = 'USD',
      applicationId,
      accountNumber,
      status,
    } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }

    const ctx = resolvePaymentContext({ locationId, publishableKey });
    const resolvedLocationId = ctx.location?.locationId || locationId;

    const record = {
      id: applicationId || transactionId || crypto.randomUUID(),
      gateway: 'alphaeon',
      status: status || eventType,
      eventType,
      applicationId,
      // Only the last 4 digits should ever reach here from the frontend —
      // never store a full Alphaeon account number server-side.
      accountNumberLast4: accountNumber ? String(accountNumber).slice(-4) : undefined,
      amount,
      currency,
      locationId: resolvedLocationId,
      ghlTransactionId: transactionId,
      orderId,
      createdAt: new Date(),
    };
    transactionStore.save(record);

    if (eventType === 'credit_decision' && status === 'approved' && resolvedLocationId && transactionId) {
      sendPaymentCaptured({
        locationId: resolvedLocationId,
        chargeId: applicationId,
        ghlTransactionId: transactionId,
        amountCents: amount != null ? Math.round(Number(amount) * 100) : undefined,
        mode: ctx.mode,
      });
    }

    logger.info({ eventType, locationId: resolvedLocationId }, 'Alphaeon event recorded');
    res.json({ recorded: true });
  });

  return router;
}

module.exports = { createAlphaeonRoutes };
