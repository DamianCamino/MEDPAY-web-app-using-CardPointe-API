const express = require('express');
const path = require('path');
const logger = require('../utils/logger');
const { GhlClient, withGhlError } = require('../services/ghl-client');
const locationStore = require('../services/location-store');
const { decryptSsoPayload } = require('../services/ghl-sso');
const { ensureAccessToken } = require('../services/ghl-session');
const { issueLocationSession } = require('../services/session-token');
const { requireLocationSession } = require('../middleware/require-location-session');
const { requireAdminKey } = require('../middleware/require-admin-key');
const { verifyHmacSignature } = require('../middleware/verify-webhook-signature');

function createGhlRoutes(config) {
  const router = express.Router();
  const ghl = new GhlClient({ ...config, publicBaseUrl: config.publicBaseUrl });
  const baseUrl = config.publicBaseUrl;

  const providerUrls = () => ({
    paymentsUrl: `${baseUrl}/checkout`,
    queryUrl: `${baseUrl}/query`,
    webhookUrl: `${baseUrl}/app/webhook`,
    manageUrl: `${baseUrl}/app/manage`,
    redirectUri: config.ghl.redirectUri,
  });

  router.get('/installed', async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send('Missing OAuth code');
    }

    if (!config.ghl.clientId || !config.ghl.clientSecret) {
      return res.status(503).send(
        'GHL OAuth not configured. Set GHL_CLIENT_ID and GHL_CLIENT_SECRET in .env'
      );
    }

    try {
      const tokenData = await withGhlError('oauth.exchange', () => ghl.exchangeCode(code));
      const locationId = tokenData.locationId || tokenData.location_id;

      if (!locationId) {
        return res.status(400).send('OAuth response missing locationId');
      }

      const keys = {
        test: locationStore.generateKeys(),
        live: locationStore.generateKeys(),
      };

      locationStore.saveLocation({
        locationId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in
          ? Date.now() + tokenData.expires_in * 1000
          : undefined,
        keys,
        cardpointe: { test: null, live: null },
        installedAt: new Date(),
      });

      const urls = providerUrls();
      await withGhlError('provider.create', () =>
        ghl.createProvider(tokenData.access_token, locationId, urls)
      );

      logger.info({ locationId }, 'GHL app installed — provider registered');

      const sessionToken = issueLocationSession(locationId);

      res.redirect(
        `/app/manage?locationId=${encodeURIComponent(locationId)}&installed=1&sessionToken=${encodeURIComponent(sessionToken)}`
      );
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      logger.error({ err: msg }, 'GHL install failed');
      res.status(500).send(`Installation failed: ${msg}`);
    }
  });

  router.get('/manage', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../public/checkout/manage.html'));
  });

  router.post('/sso/decrypt', (req, res) => {
    const { encryptedData } = req.body;
    if (!encryptedData) {
      return res.status(400).json({ error: 'encryptedData required' });
    }

    try {
      const userData = decryptSsoPayload(encryptedData, config.ghl.ssoSecret);
      const locationId =
        userData.activeLocation ||
        userData.locationId ||
        userData.location_id ||
        userData.companyId;

      res.json({
        ...userData,
        locationId,
        sessionToken: locationId ? issueLocationSession(locationId) : undefined,
      });
    } catch (err) {
      logger.error({ err: err.message }, 'SSO decrypt failed');
      res.status(400).json({ error: 'Failed to decrypt SSO payload' });
    }
  });

  router.get('/locations/:locationId', requireLocationSession, (req, res) => {
    const loc = locationStore.getLocation(req.params.locationId);
    if (!loc) return res.status(404).json({ error: 'Location not found' });

    res.json({
      locationId: loc.locationId,
      hasTestConfig: Boolean(loc.cardpointe?.test?.merchId),
      hasLiveConfig: Boolean(loc.cardpointe?.live?.merchId),
      settings: loc.settings || { surcharge: 3.99, achLimit: null },
      keys: {
        test: { publishableKey: loc.keys?.test?.publishableKey },
        live: { publishableKey: loc.keys?.live?.publishableKey },
      },
    });
  });

  router.post('/locations/:locationId/config', requireLocationSession, async (req, res) => {
    const { locationId } = req.params;
    const loc = locationStore.getLocation(locationId);

    if (!loc) {
      return res.status(404).json({ error: 'Location not found — install app first' });
    }

    const { prod, uat, surcharge, achLimit } = req.body;

    function validCreds(c) {
      return c && c.site && c.merchId && c.apiUser && c.apiPass;
    }

    if (!validCreds(prod) && !validCreds(uat)) {
      return res.status(400).json({
        error: 'Provide complete credentials (site, merchId, apiUser, apiPass) for at least Production or UAT',
      });
    }
    if (surcharge != null && (isNaN(Number(surcharge)) || Number(surcharge) < 0)) {
      return res.status(400).json({ error: 'surcharge must be a non-negative number' });
    }
    if (achLimit !== '' && achLimit != null && (isNaN(Number(achLimit)) || Number(achLimit) < 0)) {
      return res.status(400).json({ error: 'achLimit must be a non-negative number or empty' });
    }

    const cardpointe = { ...(loc.cardpointe || { test: null, live: null }) };
    if (validCreds(uat)) cardpointe.test = { site: uat.site, merchId: uat.merchId, apiUser: uat.apiUser, apiPass: uat.apiPass };
    if (validCreds(prod)) cardpointe.live = { site: prod.site, merchId: prod.merchId, apiUser: prod.apiUser, apiPass: prod.apiPass };

    const settings = {
      surcharge: surcharge != null && surcharge !== '' ? Number(surcharge) : loc.settings?.surcharge ?? 3.99,
      achLimit: achLimit != null && achLimit !== '' ? Number(achLimit) : null,
    };

    const updated = locationStore.updateLocation(locationId, { cardpointe, settings });

    try {
      if (!loc.dev) {
        const accessToken = await ensureAccessToken(locationId, config);
        await withGhlError('connect.config', () =>
          ghl.connectConfig(accessToken, locationId, updated.keys)
        );
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      return res.status(502).json({ error: `Saved locally but GHL connect failed: ${msg}` });
    }

    logger.info({ locationId }, 'CardPointe config (prod/uat/settings) saved and synced to GHL');
    res.json({
      success: true,
      locationId,
      settings: updated.settings,
      publishableKeys: { test: updated.keys.test?.publishableKey, live: updated.keys.live?.publishableKey },
    });
  });

  router.post(
    '/webhook',
    verifyHmacSignature({ headerName: 'x-ghl-signature', secretEnvVar: 'GHL_WEBHOOK_SECRET' }),
    async (req, res) => {
    const eventType = req.body?.type || req.body?.event;
    const locationId = req.body?.locationId || req.body?.location_id;

    logger.info({ eventType, locationId }, 'GHL app webhook');

    if (eventType === 'UNINSTALL' && locationId) {
      locationStore.removeLocation(locationId);
      logger.info({ locationId }, 'Location removed on uninstall');
    }

    res.sendStatus(200);
  });

  router.get('/config', (_req, res) => {
    const urls = providerUrls();
    res.json({
      ...urls,
      redirectUri: config.ghl.redirectUri,
      providerName: config.ghl.providerName,
      manageUrl: `${baseUrl}/app/manage`,
    });
  });

  router.get('/setup', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../public/checkout/setup.html'));
  });

  // Ops-only: lists every installed clinic. Previously open to anyone, which
  // handed an attacker the locationIds needed to exploit the config IDOR.
  router.get('/locations', requireAdminKey, (_req, res) => {
    res.json(locationStore.listLocations());
  });

  if (config.nodeEnv === 'development') {
    router.post('/dev/install', (req, res) => {
      const { locationId = 'dev-location-001' } = req.body || {};
      const keys = {
        test: locationStore.generateKeys(),
        live: locationStore.generateKeys(),
      };

      locationStore.saveLocation({
        locationId,
        accessToken: 'dev-token',
        refreshToken: null,
        keys,
        cardpointe: { test: null, live: null },
        installedAt: new Date(),
        dev: true,
      });

      const sessionToken = issueLocationSession(locationId);

      logger.info({ locationId }, 'Dev location installed (no OAuth)');
      res.json({
        locationId,
        keys,
        sessionToken,
        manageUrl: `/ghl/manage?locationId=${locationId}&sessionToken=${encodeURIComponent(sessionToken)}`,
      });
    });
  }

  return router;
}

module.exports = { createGhlRoutes };
