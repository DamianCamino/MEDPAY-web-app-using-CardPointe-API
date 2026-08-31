const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function getKey() {
  const raw = process.env.CREDENTIALS_ENC_KEY;
  if (!raw) {
    throw new Error(
      'CREDENTIALS_ENC_KEY not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error('CREDENTIALS_ENC_KEY must be a 32-byte value encoded as hex (64 hex chars)');
  }
  return key;
}

/**
 * Encrypts a plain string. Returns a single string "iv:authTag:ciphertext" (all hex)
 * so it stores as one opaque value (e.g. in a DB text column).
 */
function encrypt(plainText) {
  if (plainText == null) return plainText;
  const key = getKey();
  const iv = crypto.randomBytes(12); // recommended size for GCM
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

function decrypt(payload) {
  if (payload == null) return payload;
  const key = getKey();
  const [ivHex, tagHex, dataHex] = String(payload).split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Malformed encrypted payload');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString('utf8');
}

/** Encrypt every field in `fields` on a shallow-cloned object. Leaves undefined/null as-is. */
function encryptFields(obj, fields) {
  if (!obj) return obj;
  const out = { ...obj };
  for (const f of fields) {
    if (out[f] != null) out[f] = encrypt(out[f]);
  }
  return out;
}

function decryptFields(obj, fields) {
  if (!obj) return obj;
  const out = { ...obj };
  for (const f of fields) {
    if (out[f] != null) {
      try {
        out[f] = decrypt(out[f]);
      } catch {
        // Leave as-is if it wasn't actually encrypted (e.g. legacy/dev data) —
        // avoids hard-crashing reads on old records.
      }
    }
  }
  return out;
}

module.exports = { encrypt, decrypt, encryptFields, decryptFields };
