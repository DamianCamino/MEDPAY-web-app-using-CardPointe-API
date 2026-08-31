const { getCardPointeConfig } = require('../config/cardpointe');
const { getAlphaeonConfig } = require('../config/alphaeon');
const locationStore = require('./location-store');
const { resolveLocationContext } = require('./ghl-session');

/**
 * Build CardPointe config for a location + mode (test|live).
 * Falls back to global env config when location has no override.
 */
function resolveCardPointeConfig(location, mode = 'uat') {
  const envKey = mode === 'live' ? 'prod' : 'uat';
  const storeMode = mode === 'live' ? 'live' : 'test';
  const stored = location?.cardpointe?.[storeMode];

  if (stored?.merchId && stored?.site && stored?.apiUser && stored?.apiPass) {
    const host = stored.site.includes('.cardconnect.com')
      ? stored.site
      : `${stored.site}.cardconnect.com`;

    return {
      env: envKey,
      site: stored.site,
      merchId: stored.merchId,
      apiUser: stored.apiUser,
      apiPass: stored.apiPass,
      gatewayBaseUrl: `https://${host}/cardconnect/rest`,
      cardSecureBaseUrl: `https://${host}/cardsecure/api/v1`,
      tokenizerUrl: `https://${host}/itoke/ajax-tokenizer.html`,
    };
  }

  return getCardPointeConfig(envKey);
}

/**
 * Build Alphaeon config for a location + mode (test|live).
 * Falls back to global env config when location has no per-clinic override.
 * NEVER returned to the frontend as-is — callers must strip clientSecret
 * before sending anything derived from this over the wire.
 */
function resolveAlphaeonConfig(location, mode = 'test') {
  const envKey = mode === 'live' ? 'production' : 'sandbox';
  const storeMode = mode === 'live' ? 'live' : 'test';
  const stored = location?.alphaeon?.[storeMode];

  if (stored?.clientId && stored?.clientSecret && stored?.merchantId) {
    return {
      env: envKey,
      clientId: stored.clientId,
      clientSecret: stored.clientSecret,
      merchantId: stored.merchantId,
      iframeBaseUrl: stored.iframeBaseUrl || getAlphaeonConfig(envKey).iframeBaseUrl,
      apiBaseUrl: stored.apiBaseUrl || getAlphaeonConfig(envKey).apiBaseUrl,
    };
  }

  return getAlphaeonConfig(envKey);
}

function validateApiKey(body, config) {
  const { apiKey, locationId } = body;
  if (!apiKey) return { valid: false, reason: 'missing apiKey' };

  const byKey = locationStore.findByApiKey(apiKey);
  if (byKey) {
    if (locationId && byKey.locationId !== locationId) {
      return { valid: false, reason: 'apiKey does not match locationId' };
    }
    return { valid: true, location: byKey };
  }

  if (config.ghl.apiKey && apiKey === config.ghl.apiKey) {
    return { valid: true, location: locationId ? locationStore.getLocation(locationId) : null };
  }

  return { valid: false, reason: 'invalid apiKey' };
}

function resolvePaymentContext(body) {
  return resolveLocationContext({
    locationId: body.locationId,
    publishableKey: body.publishableKey,
    apiKey: body.apiKey,
  });
}

module.exports = {
  resolveCardPointeConfig,
  resolveAlphaeonConfig,
  validateApiKey,
  resolvePaymentContext,
};
