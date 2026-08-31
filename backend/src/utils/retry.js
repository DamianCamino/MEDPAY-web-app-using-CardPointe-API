const logger = require('./logger');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff.
 * Only retries on network errors or 5xx responses — not on 4xx or gateway declines.
 */
async function retryWithBackoff(fn, { retries = 3, delayMs = 500 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const isRetryable =
        !status || status >= 500 || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';

      if (!isRetryable || attempt === retries) {
        throw err;
      }

      const wait = delayMs * 2 ** attempt;
      logger.warn({ attempt: attempt + 1, wait, error: err.message }, 'retrying request');
      await sleep(wait);
    }
  }

  throw lastError;
}

module.exports = { retryWithBackoff, sleep };
