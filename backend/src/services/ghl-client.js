const axios = require('axios');
const logger = require('../utils/logger');

const GHL_API = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

class GhlClient {
  constructor(config) {
    this.clientId = config.ghl.clientId;
    this.clientSecret = config.ghl.clientSecret;
    this.redirectUri = config.ghl.redirectUri;
    this.providerName = config.ghl.providerName || 'Vital Pay';
    this.providerDescription =
      config.ghl.providerDescription || 'CardPointe payments via Vital Pay';
    this.logoUrl = config.ghl.logoUrl || `${config.publicBaseUrl}/checkout/logo.png`;

    this.http = axios.create({
      baseURL: GHL_API,
      headers: {
        Accept: 'application/json',
        Version: API_VERSION,
      },
    });
  }

  async exchangeCode(code) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      user_type: 'Location',
      redirect_uri: this.redirectUri,
    });

    const response = await this.http.post('/oauth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
  }

  async createProvider(accessToken, locationId, urls) {
    const response = await this.http.post(
      '/payments/custom-provider/provider',
      {
        name: this.providerName,
        description: this.providerDescription,
        paymentsUrl: urls.paymentsUrl,
        queryUrl: urls.queryUrl,
        imageUrl: this.logoUrl,
        supportsSubscriptionSchedule: false,
      },
      {
        params: { locationId },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.data;
  }

  async connectConfig(accessToken, locationId, keys) {
    const response = await this.http.post(
      '/payments/custom-provider/connect',
      {
        live: keys.live,
        test: keys.test,
      },
      {
        params: { locationId },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.data;
  }

  async refreshToken(refreshToken) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      user_type: 'Location',
      redirect_uri: this.redirectUri,
    });

    const response = await this.http.post('/oauth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
  }
}

async function withGhlError(context, fn) {
  try {
    return await fn();
  } catch (err) {
    logger.error({
      context,
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
}

module.exports = { GhlClient, withGhlError };
