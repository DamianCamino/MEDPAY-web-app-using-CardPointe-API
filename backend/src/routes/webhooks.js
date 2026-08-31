const express = require('express');
const logger = require('../utils/logger');
const transactionStore = require('../services/transaction-store');
const { verifyHmacSignature } = require('../middleware/verify-webhook-signature');

function createWebhookRoutes() {
  const router = express.Router();

  router.post(
    '/cardpointe',
    verifyHmacSignature({ headerName: 'x-cardpointe-signature', secretEnvVar: 'CARDPOINTE_WEBHOOK_SECRET' }),
    async (req, res) => {
    const data = req.body;
    logger.info({ event: 'cardpointe_webhook', payload: data });

    try {
      const { retref, respstat, achreturncode, event: eventType } = data;

      if (retref) {
        const status = mapWebhookStatus(respstat, eventType, achreturncode);
        transactionStore.update(retref, {
          status,
          achreturncode,
          settledAt: status === 'settled' ? new Date() : undefined,
          processorResponse: data,
        });
      }

      // TODO: forward settlement/ACH events to GHL webhook endpoint
      res.sendStatus(200);
    } catch (err) {
      logger.error({ err: err.message }, 'cardpointe webhook failed');
      res.sendStatus(500);
    }
  });

  return router;
}

function mapWebhookStatus(respstat, eventType, achreturncode) {
  if (achreturncode) return 'ach_returned';
  if (eventType === 'transaction.settled') return 'settled';
  if (respstat === 'A') return 'captured';
  if (respstat === 'C') return 'voided';
  return 'failed';
}

module.exports = { createWebhookRoutes };
