/**
 * Protects the direct /payments/* API (tokenize/authorize/capture/void/refund/transactions).
 * These are service-to-service endpoints (not called from the browser), so a
 * shared API key is the right fit — separate from the per-clinic GHL flow.
 */
function requirePaymentsApiKey(req, res, next) {
  const provided = req.headers['x-api-key'];
  const expected = process.env.PAYMENTS_API_KEY;

  if (!expected) {
    return res.status(503).json({ error: 'PAYMENTS_API_KEY not configured on server' });
  }
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Invalid or missing X-Api-Key' });
  }
  next();
}

module.exports = { requirePaymentsApiKey };
