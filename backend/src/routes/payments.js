const express = require('express');
const logger = require('../utils/logger');
const transactionStore = require('../services/transaction-store');
const { requirePaymentsApiKey } = require('../middleware/require-payments-api-key');

function createPaymentRoutes(gateway) {
  const router = express.Router();

  // Every route below is service-to-service (not called from a browser), so
  // require a shared API key on all of them. Previously anyone who could
  // reach this server could tokenize/charge/void/refund and list every
  // transaction with no auth at all.
  router.use(requirePaymentsApiKey);

  router.post('/tokenize', async (req, res) => {
    try {
      const result = await gateway.tokenize(req.body);
      res.json(result);
    } catch (err) {
      logger.error({ err: err.message }, 'tokenize failed');
      res.status(err.response?.status || 400).json({ error: err.message });
    }
  });

  router.post('/authorize', async (req, res) => {
    const idempotencyKey = req.headers['idempotency-key'];

    try {
      const result = await gateway.authorize(req.body, idempotencyKey);
      const record = gateway.mapToTransactionRecord(result, req.body);
      transactionStore.save(record);

      res.json({
        ...result,
        chargeId: gateway.getChargeId(result),
        approved: gateway.isApproved(result),
      });
    } catch (err) {
      logger.error({ err: err.message, code: err.code }, 'authorize failed');
      const status = err.code === 'TIMEOUT_UNKNOWN' ? 504 : err.response?.status || 500;
      res.status(status).json({ error: err.message, retref: err.retref });
    }
  });

  router.post('/capture', async (req, res) => {
    try {
      const result = await gateway.capture(req.body);
      if (req.body.retref) {
        transactionStore.update(req.body.retref, { status: 'captured', processorResponse: result });
      }
      res.json(result);
    } catch (err) {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  });

  router.post('/void', async (req, res) => {
    try {
      const result = await gateway.void(req.body);
      if (req.body.retref) {
        transactionStore.update(req.body.retref, { status: 'voided', voidedAt: new Date() });
      }
      res.json(result);
    } catch (err) {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  });

  router.post('/refund', async (req, res) => {
    try {
      const result = await gateway.refund(req.body);
      if (req.body.retref) {
        transactionStore.update(req.body.retref, { status: 'refunded', refundedAt: new Date() });
      }
      res.json(result);
    } catch (err) {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  });

  router.get('/inquire/:retref', async (req, res) => {
    try {
      const result = await gateway.inquire({
        retref: req.params.retref,
        merchid: req.query.merchid,
      });
      res.json(result);
    } catch (err) {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  });

  router.get('/transactions', (_req, res) => {
    res.json(transactionStore.list());
  });

  return router;
}

module.exports = { createPaymentRoutes };
