const axios = require('axios');
const logger = require('../utils/logger');
const { retryWithBackoff, sleep } = require('../utils/retry');
const idempotency = require('../utils/idempotency');
const {
  authSchema,
  captureSchema,
  retrefSchema,
  tokenizeSchema,
} = require('./validators/cardpointe');

const TIMEOUT_RESP_CODE = '62';
const INQUIRY_DELAY_MS = 3000;

class CardPointeClient {
  constructor(config) {
    this.config = config;
    this.http = axios.create({
      timeout: 35000,
      auth: {
        username: config.apiUser,
        password: config.apiPass,
      },
      headers: { 'Content-Type': 'application/json' },
    });

    this.cardSecureHttp = axios.create({
      baseURL: config.cardSecureBaseUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async request(method, path, data) {
    const url = `${this.config.gatewayBaseUrl}${path}`;
    const start = Date.now();

    try {
      const response = await retryWithBackoff(() =>
        this.http.request({ method, url, data })
      );

      logger.info({
        event: 'cardpointe_request',
        method,
        path,
        duration: Date.now() - start,
        respstat: response.data?.respstat,
        respcode: response.data?.respcode,
        retref: response.data?.retref,
      });

      if (response.data?.respstat && response.data.respstat !== 'A') {
        logger.warn({
          event: 'cardpointe_decline',
          path,
          respcode: response.data.respcode,
          resptext: response.data.resptext,
        });
      }

      return response.data;
    } catch (error) {
      logger.error({
        event: 'cardpointe_error',
        method,
        path,
        duration: Date.now() - start,
        status: error.response?.status,
        error: error.message,
      });
      throw error;
    }
  }

  async tokenize(cardData) {
    const payload = tokenizeSchema.parse(cardData);
    const response = await this.cardSecureHttp.post('/ccn/tokenize', payload);
    return response.data;
  }

  async auth(data, idempotencyKey) {
    if (idempotencyKey) {
      const cached = idempotency.get(idempotencyKey);
      if (cached) return cached;
    }

    const payload = authSchema.parse({
      ...data,
      merchid: data.merchid || this.config.merchId,
      capture: (data.capture || 'Y').toUpperCase(),
    });

    let result = await this.request('PUT', '/auth', payload);

    if (result.respcode === TIMEOUT_RESP_CODE && result.retref) {
      logger.warn({ retref: result.retref }, 'auth timeout — inquiring status');
      await sleep(INQUIRY_DELAY_MS);
      const inquiry = await this.inquire({
        retref: result.retref,
        merchid: payload.merchid,
      });

      if (inquiry.respstat === 'A') {
        result = inquiry;
      } else if (inquiry.respstat === 'C') {
        result = inquiry;
      } else {
        const err = new Error('Transaction timed out — status unknown');
        err.code = 'TIMEOUT_UNKNOWN';
        err.retref = result.retref;
        throw err;
      }
    }

    if (idempotencyKey) {
      idempotency.set(idempotencyKey, result);
    }

    return result;
  }

  async capture(data) {
    const payload = captureSchema.parse({
      ...data,
      merchid: data.merchid || this.config.merchId,
    });
    return this.request('PUT', '/capture', payload);
  }

  async void(data) {
    const payload = retrefSchema.parse({
      ...data,
      merchid: data.merchid || this.config.merchId,
    });
    return this.request('PUT', '/void', payload);
  }

  async refund(data) {
    const payload = retrefSchema.parse({
      ...data,
      merchid: data.merchid || this.config.merchId,
    });
    return this.request('PUT', '/refund', payload);
  }

  async inquire({ retref, merchid }) {
    const mid = merchid || this.config.merchId;
    return this.request('GET', `/inquire/${retref}/${mid}`);
  }
}

module.exports = { CardPointeClient, TIMEOUT_RESP_CODE };
