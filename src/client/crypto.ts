import { constants, createCipheriv, createDecipheriv, createHash, publicEncrypt, randomInt } from 'node:crypto';
import { RouterError } from './errors.js';
import type { Fields } from './types.js';

export const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
export function integrityCheck(body: string, publicKey: string): string {
  try {
    return publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(sha256(body))).toString('base64');
  } catch { throw new RouterError('PROTOCOL', 'Could not construct firmware request-integrity header.'); }
}
export function encodeFields(fields: Fields): string {
  // Matches encodeURIComponent used by the firmware, including !'()* and %20.
  return Object.entries(fields).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
}
function keyIv(key: string, iv: string): [Buffer, Buffer] {
  return [createHash('sha256').update(key).digest(), createHash('sha256').update(iv).digest().subarray(0, 16)];
}
export function encryptField(value: string, key: string, iv: string): string {
  if (!value) return value;
  const [k, v] = keyIv(key, iv);
  const bytes = Buffer.from(value);
  const padded = Buffer.alloc(Math.ceil(bytes.length / 16) * 16);
  bytes.copy(padded);
  const cipher = createCipheriv('aes-256-cbc', k, v);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(padded), cipher.final()]).toString('base64');
}
export function decryptField(value: string, sessionToken: string): string {
  if (!value) return value;
  try {
    const [key, iv] = keyIv(sessionToken, [...sessionToken].reverse().join(''));
    const cipher = createDecipheriv('aes-256-cbc', key, iv);
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(Buffer.from(value, 'base64')), cipher.final()]).toString('utf8').replace(/\0+$/, '');
  } catch { throw new RouterError('PROTOCOL', 'Could not decode an encrypted router field.'); }
}
export function encryptParameters(fields: Fields, encoded: string[], publicKey: string): Fields {
  const names = Object.keys(fields).filter(name => encoded.some(prefix => name.startsWith(prefix)));
  if (!names.length) return { ...fields };
  const digits = () => Array.from({ length: 16 }, () => randomInt(10)).join('');
  const key = digits(), iv = digits();
  const result = { ...fields };
  for (const name of names) result[name] = encryptField(result[name]!, key, iv);
  result.encode = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(`${key}+${iv}`)).toString('base64');
  return result;
}
