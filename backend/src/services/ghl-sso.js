const crypto = require('crypto');

/**
 * OpenSSL-compatible EVP_BytesToKey (AES-256-CBC + Salted__ header).
 * GHL Custom Pages SSO uses this format.
 */
function evpBytesToKey(password, salt, keyLen, ivLen) {
  let derived = Buffer.alloc(0);
  let block = Buffer.alloc(0);

  while (derived.length < keyLen + ivLen) {
    const hash = crypto.createHash('md5');
    hash.update(Buffer.concat([block, Buffer.from(password, 'utf8'), salt]));
    block = hash.digest();
    derived = Buffer.concat([derived, block]);
  }

  return {
    key: derived.subarray(0, keyLen),
    iv: derived.subarray(keyLen, keyLen + ivLen),
  };
}

function decryptSsoPayload(encryptedData, sharedSecret) {
  if (!sharedSecret) {
    throw new Error('GHL SSO shared secret not configured');
  }

  const data = Buffer.from(encryptedData, 'base64');
  const header = data.subarray(0, 8).toString('utf8');

  if (header !== 'Salted__') {
    throw new Error('Invalid SSO payload — expected Salted__ header');
  }

  const salt = data.subarray(8, 16);
  const ciphertext = data.subarray(16);
  const { key, iv } = evpBytesToKey(sharedSecret, salt, 32, 16);

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return JSON.parse(decrypted.toString('utf8'));
}

module.exports = { decryptSsoPayload };
