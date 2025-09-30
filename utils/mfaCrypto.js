import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_B64 = process.env.MFA_ENCRYPTION_KEY || '';
const KEY = KEY_B64 ? Buffer.from(KEY_B64, 'base64') : null;

if (!KEY || KEY.length !== 32) {
  // Do not throw in runtime so tests or some envs won't break; throw when used.
  // Consumers should check and fail early if key missing.
}

export function ensureKey() {
  if (!KEY || KEY.length !== 32) throw new Error('MFA_ENCRYPTION_KEY must be set (base64 32-byte key)');
  return KEY;
}

export function encryptSecret(plain) {
  const key = ensureKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptSecret(enc) {
  const key = ensureKey();
  const data = Buffer.from(enc, 'base64');
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const ciphertext = data.slice(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}
