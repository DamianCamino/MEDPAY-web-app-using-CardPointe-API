/**
 * Dev helper — encrypt a test SSO payload (OpenSSL Salted__ format).
 * Usage: node scripts/ghl-sso-test-encrypt.js
 */
const crypto = require('crypto');

function evpBytesToKey(password, salt, keyLen, ivLen) {
  let derived = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  while (derived.length < keyLen + ivLen) {
    const hash = crypto.createHash('md5');
    hash.update(Buffer.concat([block, Buffer.from(password, 'utf8'), salt]));
    block = hash.digest();
    derived = Buffer.concat([derived, block]);
  }
  return { key: derived.subarray(0, keyLen), iv: derived.subarray(keyLen, keyLen + ivLen) };
}

function encrypt(payload, secret) {
  const salt = crypto.randomBytes(8);
  const { key, iv } = evpBytesToKey(secret, salt, 32, 16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([Buffer.from('Salted__'), salt, encrypted]).toString('base64');
}

const secret = process.env.GHL_SSO_SECRET || 'test-sso-secret';
const payload = {
  userId: 'test-user',
  activeLocation: 'clinic-77plastic',
  companyId: 'test-company',
  role: 'admin',
};

const encrypted = encrypt(payload, secret);
console.log('Encrypted SSO payload (POST to /ghl/sso/decrypt):');
console.log(encrypted);
