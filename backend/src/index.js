require('dotenv').config({ path: require('path').resolve(__dirname, '../../infrastructure/.env') });

const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { loadConfig } = require('./config');
const { createGateway } = require('./lib/gateway-factory');
const { createPaymentRoutes } = require('./routes/payments');
const { createQueryRoutes } = require('./routes/query');
const { createWebhookRoutes } = require('./routes/webhooks');
const { createCheckoutRoutes } = require('./routes/checkout');
const { createAlphaeonRoutes } = require('./routes/alphaeon');
const { createGhlRoutes } = require('./routes/ghl');
const logger = require('./utils/logger');

const config = loadConfig();
const gateway = createGateway(config.defaultGateway, config);

const app = express();

// Capture the raw body so webhook signature verification (HMAC over the
// exact bytes sent) works regardless of JSON formatting/whitespace.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// General rate limit: blunts credential-stuffing / brute-force / scraping
// across the whole API.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Tighter limit specifically on saving CardPointe credentials — this is the
// most sensitive write in the app (previously the target of the IDOR), so it
// gets its own stricter ceiling on top of the general one.
const configWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://app.advital.app https://*.gohighlevel.com https://*.leadconnectorhq.com");
  next();
});

app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url });
  next();
});

app.use('/checkout', express.static(path.join(__dirname, '../public/checkout')));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    gateway: config.defaultGateway,
    cardpointeEnv: config.cardpointe.env,
    site: config.cardpointe.site,
    paymentsUrl: '/checkout',
    queryUrl: '/query',
  });
});

app.use('/payments', createPaymentRoutes(gateway));
app.use('/checkout', createCheckoutRoutes(gateway, config));
app.use('/query', createQueryRoutes(gateway, config));
app.use('/webhooks', createWebhookRoutes());
const ghlRoutes = createGhlRoutes(config);
app.use('/ghl/locations/:locationId/config', configWriteLimiter);
app.use('/ghl', ghlRoutes);
app.use('/alphaeon/locations/:locationId/config', configWriteLimiter);
app.use('/alphaeon', createAlphaeonRoutes());
app.use('/oauth', ghlRoutes);
app.use('/app', ghlRoutes);

app.use((err, _req, res, _next) => {
  logger.error({ err: err.message }, 'unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

const port = config.port;
app.listen(port, () => {
  logger.info(
    { port, gateway: config.defaultGateway, env: config.cardpointe.env },
    'Vital Pay backend started'
  );
});

module.exports = app;
