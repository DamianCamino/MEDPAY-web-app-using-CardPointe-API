const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/crypto');

const locations = new Map();

// Fields that must never sit in memory/DB unencrypted.
const CARDPOINTE_SECRET_FIELDS = ['apiUser', 'apiPass'];
const ALPHAEON_SECRET_FIELDS = ['clientSecret'];
const TOKEN_FIELDS = ['accessToken', 'refreshToken'];

function encryptCardpointe(cardpointe) {
  if (!cardpointe) return cardpointe;
  const out = {};
  for (const mode of ['test', 'live']) {
    const entry = cardpointe[mode];
    if (!entry) {
      out[mode] = entry;
      continue;
    }
    const clone = { ...entry };
    for (const f of CARDPOINTE_SECRET_FIELDS) {
      if (clone[f] != null) clone[f] = encrypt(clone[f]);
    }
    out[mode] = clone;
  }
  return out;
}

function decryptCardpointe(cardpointe) {
  if (!cardpointe) return cardpointe;
  const out = {};
  for (const mode of ['test', 'live']) {
    const entry = cardpointe[mode];
    if (!entry) {
      out[mode] = entry;
      continue;
    }
    const clone = { ...entry };
    for (const f of CARDPOINTE_SECRET_FIELDS) {
      if (clone[f] != null) {
        try {
          clone[f] = decrypt(clone[f]);
        } catch {
          // leave as-is (defensive: don't crash reads on malformed/legacy data)
        }
      }
    }
    out[mode] = clone;
  }
  return out;
}

function encryptAlphaeon(alphaeon) {
  if (!alphaeon) return alphaeon;
  const out = {};
  for (const mode of ['test', 'live']) {
    const entry = alphaeon[mode];
    if (!entry) {
      out[mode] = entry;
      continue;
    }
    const clone = { ...entry };
    for (const f of ALPHAEON_SECRET_FIELDS) {
      if (clone[f] != null) clone[f] = encrypt(clone[f]);
    }
    out[mode] = clone;
  }
  return out;
}

function decryptAlphaeon(alphaeon) {
  if (!alphaeon) return alphaeon;
  const out = {};
  for (const mode of ['test', 'live']) {
    const entry = alphaeon[mode];
    if (!entry) {
      out[mode] = entry;
      continue;
    }
    const clone = { ...entry };
    for (const f of ALPHAEON_SECRET_FIELDS) {
      if (clone[f] != null) {
        try {
          clone[f] = decrypt(clone[f]);
        } catch {
          // leave as-is (defensive: don't crash reads on malformed/legacy data)
        }
      }
    }
    out[mode] = clone;
  }
  return out;
}

function encryptTokens(record) {
  const clone = { ...record };
  for (const f of TOKEN_FIELDS) {
    if (clone[f] != null) clone[f] = encrypt(clone[f]);
  }
  if (clone.cardpointe) clone.cardpointe = encryptCardpointe(clone.cardpointe);
  if (clone.alphaeon) clone.alphaeon = encryptAlphaeon(clone.alphaeon);
  return clone;
}

function decryptTokens(record) {
  if (!record) return record;
  const clone = { ...record };
  for (const f of TOKEN_FIELDS) {
    if (clone[f] != null) {
      try {
        clone[f] = decrypt(clone[f]);
      } catch {
        // leave as-is
      }
    }
  }
  if (clone.cardpointe) clone.cardpointe = decryptCardpointe(clone.cardpointe);
  if (clone.alphaeon) clone.alphaeon = decryptAlphaeon(clone.alphaeon);
  return clone;
}

function saveLocation(record) {
  const stored = encryptTokens({ ...record, updatedAt: new Date() });
  locations.set(record.locationId, stored);
  return decryptTokens(stored);
}

function getLocation(locationId) {
  return decryptTokens(locations.get(locationId));
}

function getRawLocation(locationId) {
  return locations.get(locationId);
}

function findByPublishableKey(publishableKey) {
  for (const loc of locations.values()) {
    if (
      loc.keys?.test?.publishableKey === publishableKey ||
      loc.keys?.live?.publishableKey === publishableKey
    ) {
      return decryptTokens(loc);
    }
  }
  return undefined;
}

function findByApiKey(apiKey) {
  for (const loc of locations.values()) {
    if (loc.keys?.test?.apiKey === apiKey || loc.keys?.live?.apiKey === apiKey) {
      return decryptTokens(loc);
    }
  }
  return undefined;
}

function updateLocation(locationId, patch) {
  const existing = getRawLocation(locationId);
  if (!existing) return undefined;

  const merged = { ...decryptTokens(existing), ...patch, updatedAt: new Date() };
  const stored = encryptTokens(merged);
  locations.set(locationId, stored);
  return decryptTokens(stored);
}

function removeLocation(locationId) {
  return locations.delete(locationId);
}

function generateKeys() {
  return {
    apiKey: `vp_sk_${crypto.randomBytes(24).toString('hex')}`,
    publishableKey: `vp_pk_${crypto.randomBytes(16).toString('hex')}`,
  };
}

function listLocations() {
  return [...locations.values()].map((loc) => ({
    locationId: loc.locationId,
    hasTestConfig: Boolean(loc.cardpointe?.test?.merchId),
    hasLiveConfig: Boolean(loc.cardpointe?.live?.merchId),
    hasAlphaeonTestConfig: Boolean(loc.alphaeon?.test?.clientId),
    hasAlphaeonLiveConfig: Boolean(loc.alphaeon?.live?.clientId),
    updatedAt: loc.updatedAt,
  }));
}

module.exports = {
  saveLocation,
  getLocation,
  findByApiKey,
  findByPublishableKey,
  updateLocation,
  removeLocation,
  generateKeys,
  listLocations,
};
