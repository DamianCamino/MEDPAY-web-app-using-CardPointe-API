const locationStore = require('./location-store');
const { GhlClient } = require('./ghl-client');
const logger = require('../utils/logger');

async function ensureAccessToken(locationId, config) {
  const loc = locationStore.getLocation(locationId);
  if (!loc || loc.dev) return loc?.accessToken;

  const bufferMs = 60_000;
  if (loc.expiresAt && loc.expiresAt > Date.now() + bufferMs) {
    return loc.accessToken;
  }

  if (!loc.refreshToken) return loc.accessToken;

  const ghl = new GhlClient({ ...config, publicBaseUrl: config.publicBaseUrl });
  try {
    const refreshed = await ghl.refreshToken(loc.refreshToken);
    locationStore.updateLocation(locationId, {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || loc.refreshToken,
      expiresAt: refreshed.expires_in
        ? Date.now() + refreshed.expires_in * 1000
        : loc.expiresAt,
    });
    logger.info({ locationId }, 'GHL access token refreshed');
    return refreshed.access_token;
  } catch (err) {
    logger.error({ locationId, err: err.message }, 'GHL token refresh failed');
    return loc.accessToken;
  }
}

function resolveLocationContext({ locationId, publishableKey, apiKey }) {
  if (locationId) {
    const loc = locationStore.getLocation(locationId);
    if (loc) return { location: loc, mode: inferModeFromKeys(loc, publishableKey, apiKey) };
  }

  if (publishableKey) {
    const loc = locationStore.findByPublishableKey(publishableKey);
    if (loc) return { location: loc, mode: inferModeFromKeys(loc, publishableKey, apiKey) };
  }

  if (apiKey) {
    const loc = locationStore.findByApiKey(apiKey);
    if (loc) return { location: loc, mode: inferModeFromKeys(loc, publishableKey, apiKey) };
  }

  return { location: null, mode: 'test' };
}

function inferModeFromKeys(loc, publishableKey, apiKey) {
  if (publishableKey && loc.keys?.live?.publishableKey === publishableKey) return 'live';
  if (apiKey && loc.keys?.live?.apiKey === apiKey) return 'live';
  return 'test';
}

module.exports = { ensureAccessToken, resolveLocationContext };
