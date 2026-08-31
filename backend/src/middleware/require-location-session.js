const { verifyLocationSession } = require('../services/session-token');

/**
 * Protects routes like /locations/:locationId and /locations/:locationId/config.
 * Requires an `Authorization: Bearer <token>` header carrying a signed session
 * issued via OAuth install or SSO decrypt, and the token's locationId must match
 * the :locationId in the URL. This is what closes the IDOR: a caller can no
 * longer just guess/type a locationId in the URL to read or overwrite another
 * clinic's config — they must hold a token GHL's own session flow gave them.
 */
function requireLocationSession(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  const session = verifyLocationSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Missing or invalid session. Open this page from Ad Vital / GHL again.' });
  }

  if (session.locationId !== req.params.locationId) {
    return res.status(403).json({ error: 'Session does not authorize this location' });
  }

  req.locationSession = session;
  next();
}

module.exports = { requireLocationSession };
