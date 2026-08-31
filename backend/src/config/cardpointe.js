/**
 * CardPointe environment configuration.
 * Resolves UAT vs PROD from CARDPOINTE_ENV.
 */

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const environments = {
  uat: () => ({
    env: 'uat',
    site: requireEnv('CARDPOINTE_SITE_UAT'),
    merchId: requireEnv('CARDPOINTE_MERCHID_UAT'),
    apiUser: requireEnv('CARDPOINTE_API_USER_UAT'),
    apiPass: requireEnv('CARDPOINTE_API_PASS_UAT'),
  }),
  prod: () => ({
    env: 'prod',
    site: requireEnv('CARDPOINTE_SITE_PROD'),
    merchId: requireEnv('CARDPOINTE_MERCHID_PROD'),
    apiUser: requireEnv('CARDPOINTE_API_USER_PROD'),
    apiPass: requireEnv('CARDPOINTE_API_PASS_PROD'),
  }),
};

function getCardPointeConfig(envName = process.env.CARDPOINTE_ENV || 'uat') {
  const resolver = environments[envName];
  if (!resolver) {
    throw new Error(`Invalid CARDPOINTE_ENV: ${envName}. Use "uat" or "prod".`);
  }

  const config = resolver();
  const host = config.site.includes('.cardconnect.com')
    ? config.site
    : `${config.site}.cardconnect.com`;

  return {
    ...config,
    gatewayBaseUrl: `https://${host}/cardconnect/rest`,
    cardSecureBaseUrl: `https://${host}/cardsecure/api/v1`,
    tokenizerUrl: `https://${host}/itoke/ajax-tokenizer.html`,
  };
}

module.exports = { getCardPointeConfig, environments };
