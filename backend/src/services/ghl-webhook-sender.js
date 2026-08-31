const axios = require('axios');
const logger = require('../utils/logger');
const locationStore = require('./location-store');

const GHL_PAYMENTS_WEBHOOK =
  process.env.GHL_PAYMENTS_WEBHOOK_URL ||
  'https://backend.leadconnectorhq.com/payments/custom-provider/webhook';

async function sendPaymentCaptured({ locationId, chargeId, ghlTransactionId, amountCents, mode = 'test' }) {
  const location = locationStore.getLocation(locationId);
  if (!location) {
    logger.warn({ locationId }, 'skip GHL webhook — location not found');
    return;
  }

  const apiKey = location.keys?.[mode]?.apiKey;
  if (!apiKey) {
    logger.warn({ locationId, mode }, 'skip GHL webhook — no apiKey');
    return;
  }

  const payload = {
    event: 'payment.captured',
    chargeId,
    ghlTransactionId,
    locationId,
    apiKey,
    chargeSnapshot: {
      status: 'succeeded',
      amount: amountCents,
      chargeId,
      chargedAt: Math.floor(Date.now() / 1000),
    },
  };

  if (process.env.GHL_MARKETPLACE_APP_ID) {
    payload.marketplaceAppId = process.env.GHL_MARKETPLACE_APP_ID;
  }

  try {
    await axios.post(GHL_PAYMENTS_WEBHOOK, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    logger.info({ locationId, chargeId, ghlTransactionId }, 'GHL payment.captured webhook sent');
  } catch (err) {
    logger.error({
      locationId,
      chargeId,
      status: err.response?.status,
      error: err.message,
    }, 'GHL webhook failed');
  }
}

module.exports = { sendPaymentCaptured };
