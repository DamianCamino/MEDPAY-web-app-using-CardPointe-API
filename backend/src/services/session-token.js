const crypto = require('crypto');

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 min — enough for a config-save session inside the iframe

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  return secret;
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payloadStr) {
  return base64url(crypto.createHmac('sha256', getSecret()).update(payloadStr).digest());
}

/**
 * Issues a signed, expiring token bound to a single locationId.
 * Format: base64url(json).signature — verifiable without any server-side storage.
 */
function issueLocationSession(locationId, ttlMs = DEFAULT_TTL_MS) {
  const payload = { locationId, exp: Date.now() + ttlMs };
  const payloadStr = base64url(Buffer.from(JSON.stringify(payload)));
  const signature = sign(payloadStr);
  return `${payloadStr}.${signature}`;
}

/**
 * Verifies a token and, if valid, returns { locationId }.
 * Returns null if invalid, expired, or tampered.
 */
function verifyLocationSession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;

  const [payloadStr, signature] = token.split('.');
  const expected = sign(payloadStr);

  const sigBuf = Buffer.from(signature || '');
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const json = Buffer.from(payloadStr.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(json);
    if (!payload.locationId || !payload.exp || Date.now() > payload.exp) return null;
    return { locationId: payload.locationId };
  } catch {
    return null;
  }
}

module.exports = { issueLocationSession, verifyLocationSession };
