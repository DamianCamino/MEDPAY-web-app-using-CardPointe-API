/**
 * In-memory idempotency store.
 * Replace with Redis or DB in production for multi-instance deployments.
 */

const store = new Map();

function get(key) {
  if (!key) return undefined;
  return store.get(key);
}

function set(key, value, ttlMs = 24 * 60 * 60 * 1000) {
  if (!key) return;
  store.set(key, value);
  setTimeout(() => store.delete(key), ttlMs);
}

function clear() {
  store.clear();
}

module.exports = { get, set, clear };
