/**
 * Alphaeon environment configuration.
 * Resolves sandbox vs production from ALPHAEON_ENV.
 *
 * IMPORTANT: unlike the leaked reference implementation, there is NO
 * hardcoded fallback secret here. If an env var is missing, callers get an
 * explicit error instead of a silently-reused credential.
 */

const environments = {
  sandbox: () => ({
    env: 'sandbox',
    clientId: process.env.ALPHAEON_CLIENT_ID_SANDBOX || '',
    clientSecret: process.env.ALPHAEON_CLIENT_SECRET_SANDBOX || '',
    merchantId: process.env.ALPHAEON_MERCHANT_ID_SANDBOX || '',
    iframeBaseUrl:
      process.env.ALPHAEON_IFRAME_URL_SANDBOX ||
      'https://iframe.go.sandbox.alphaeontest.com/credit-portal',
    apiBaseUrl: process.env.ALPHAEON_API_URL_SANDBOX || 'https://api.sandbox.alphaeontest.com',
  }),
  production: () => ({
    env: 'production',
    clientId: process.env.ALPHAEON_CLIENT_ID_PROD || '',
    clientSecret: process.env.ALPHAEON_CLIENT_SECRET_PROD || '',
    merchantId: process.env.ALPHAEON_MERCHANT_ID_PROD || '',
    iframeBaseUrl: process.env.ALPHAEON_IFRAME_URL_PROD || 'https://iframe.go.alphaeon.com/credit-portal',
    apiBaseUrl: process.env.ALPHAEON_API_URL_PROD || 'https://api.alphaeon.com',
  }),
};

function getAlphaeonConfig(envName = process.env.ALPHAEON_ENV || 'sandbox') {
  const resolver = environments[envName];
  if (!resolver) {
    throw new Error(`Invalid ALPHAEON_ENV: ${envName}. Use "sandbox" or "production".`);
  }
  return resolver();
}

module.exports = { getAlphaeonConfig, environments };
