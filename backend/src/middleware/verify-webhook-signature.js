const crypto = require('crypto');

/**
 * Generic HMAC-SHA256 webhook verifier: expects the raw body to have been
 * signed by the sender with a shared secret, delivered in `headerName`
 * (hex-encoded signature).
 *
 * IMPORTANT — read before going live:
 * - GoHighLevel marketplace webhooks are signed by GHL using an RSA keypair
 *   (verify with GHL's published public key, not a shared secret) per their
 *   current docs. The HMAC-with-shared-secret check below is a safe default
 *   that fails closed (rejects unsigned/unverifiable requests), but you should
 *   swap in RSA-SHA256 verification against GHL's public key before
 *   processing real installs/uninstalls in production — check
 *   the current GHL marketplace webhook docs for the exact header name and
 *   algorithm at install time, since this can change.
 * - CardPointe/Fiserv webhook signing depends on how your merchant boarding
 *   was configured (IP allowlisting vs. shared secret vs. none). Confirm with
 *   Fiserv which mechanism your account uses and adjust `headerName`/secret
 *   accordingly.
 *
 * Until real signing secrets are configured, this fails closed in production
 * (NODE_ENV=production) and only allows requests through in development, so
 * you can keep testing locally without a hard blocker.
 */
function verifyHmacSignature({ headerName, secretEnvVar }) {
  return (req, res, next) => {
    const secret = process.env[secretEnvVar];
    const signature = req.headers[headerName.toLowerCase()];

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: `${secretEnvVar} not configured on server` });
      }
      // dev/test: allow through unsigned so local testing isn't blocked
      return next();
    }

    if (!signature) {
      return res.status(401).json({ error: `Missing ${headerName} header` });
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest('hex');

    const sigBuf = Buffer.from(String(signature));
    const expBuf = Buffer.from(expected);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    next();
  };
}

module.exports = { verifyHmacSignature };
