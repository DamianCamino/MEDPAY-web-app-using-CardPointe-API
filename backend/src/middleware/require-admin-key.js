/**
 * Protects internal/ops-only endpoints (e.g. listing every installed location).
 * Not meant for clinic-facing use — this is for your own team's tooling.
 */
function requireAdminKey(req, res, next) {
  const provided = req.headers['x-admin-key'];
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    return res.status(503).json({ error: 'ADMIN_API_KEY not configured on server' });
  }
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Invalid or missing X-Admin-Key' });
  }
  next();
}

module.exports = { requireAdminKey };
