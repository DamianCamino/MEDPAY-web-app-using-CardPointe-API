const { getCardPointeConfig } = require('./cardpointe');

function loadConfig() {
  const port = Number(process.env.PORT) || 3000;
  const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;

  return {
    port,
    nodeEnv: process.env.NODE_ENV || 'development',
    publicBaseUrl,
    cardpointe: getCardPointeConfig(),
    ghl: {
      clientId: process.env.GHL_CLIENT_ID || '',
      clientSecret: process.env.GHL_CLIENT_SECRET || '',
      redirectUri: process.env.GHL_REDIRECT_URI || `${publicBaseUrl}/oauth/installed`,
      apiKey: process.env.GHL_API_KEY || '',
      webhookUrl:
        process.env.GHL_PAYMENTS_WEBHOOK_URL ||
        'https://backend.leadconnectorhq.com/payments/custom-provider/webhook',
      marketplaceAppId: process.env.GHL_MARKETPLACE_APP_ID || '',
      providerName: process.env.GHL_PROVIDER_NAME || 'Vital Pay',
      providerDescription:
        process.env.GHL_PROVIDER_DESCRIPTION || 'Secure card payments via CardPointe',
      logoUrl: process.env.GHL_LOGO_URL || `${publicBaseUrl}/checkout/logo.svg`,
      ssoSecret: process.env.GHL_SSO_SECRET || '',
    },
    defaultGateway: process.env.DEFAULT_PAYMENT_GATEWAY || 'cardpointe',
  };
}

module.exports = { loadConfig };
