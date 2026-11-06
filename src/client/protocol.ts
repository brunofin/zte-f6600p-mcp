import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { RouterError } from './errors.js';
import type { RouterResponse } from './types.js';

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: false,
  isArray: tag => ['Instance', 'ParaName', 'ParaValue', 'encode'].includes(tag) });
export const secretName = /password|passphrase|wepkey(?!index)|wpspin|secret|token|cookie|authorization|serialnumber|^check$|^encode$|^keyword$/i;
export function isEncodedField(name: string, prefixes: string[]): boolean {
  // Wire response parameters use the exact metadata name or numbered key
  // inputs. Do not mistake a selector such as WEPKeyIndex for a WEP key.
  return prefixes.some(prefix => name === prefix || (name.startsWith(prefix) && /^\d+$/.test(name.slice(prefix.length))));
}
export function redact(value: unknown, encoded: string[] = []): unknown {
  if (Array.isArray(value)) return value.map(v => redact(v, encoded));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => [
    key, secretName.test(key) || isEncodedField(key, encoded) ? '[REDACTED]' : redact(v, encoded),
  ]));
  return value;
}
export function safeResponse(response: RouterResponse): RouterResponse {
  return redact(response, response.encodedFields) as RouterResponse;
}
export function parseResponse(body: string): RouterResponse {
  if (/<!DOCTYPE|<!ENTITY/i.test(body)) throw new RouterError('PROTOCOL', 'DTD/entity declarations are not accepted.');
  if (body.trimStart().startsWith('{')) {
    let data: unknown;
    try { data = JSON.parse(body); } catch { throw new RouterError('PROTOCOL', 'Invalid router JSON.'); }
    if (data && typeof data === 'object') {
      const root = data as Record<string, unknown>;
      checkStatus(root);
    }
    return { objects: {}, encodedFields: [], data };
  }
  // Firmware sometimes embeds a session error in an HTML response with HTTP 200.
  if (/<IF_ERRORSTR\b[^>]*>\s*SessionTimeout\s*<\/IF_ERRORSTR>/i.test(body) ||
      (/^\s*<html\b/i.test(body) && /SessionTimeout/i.test(body))) {
    throw new RouterError('SESSION_EXPIRED', 'Router session expired; no write was retried.');
  }
  if (XMLValidator.validate(body) !== true) throw new RouterError('PROTOCOL', 'Invalid router XML.');
  const document = parser.parse(body) as Record<string, unknown>;
  const root = document.ajax_response_xml_root as Record<string, unknown> | undefined;
  if (!root || typeof root !== 'object') throw new RouterError('PROTOCOL', 'Unexpected router response.');
  checkStatus(root);
  const objects: RouterResponse['objects'] = {};
  const encoded = new Set<string>();
  for (const item of (root.encode as unknown[] | undefined) ?? []) for (const field of String(item).split(',')) if (field) encoded.add(field);
  for (const [name, raw] of Object.entries(root)) {
    if (!name.startsWith('OBJ_') || !raw || typeof raw !== 'object') continue;
    const object = raw as Record<string, unknown>;
    for (const item of (object.encode as unknown[] | undefined) ?? []) for (const field of String(item).split(',')) if (field) encoded.add(field);
    objects[name] = ((object.Instance as Record<string, unknown>[] | undefined) ?? []).map(instance => {
      const names = (instance.ParaName as unknown[] | undefined) ?? [];
      const values = (instance.ParaValue as unknown[] | undefined) ?? [];
      if (names.length !== values.length) throw new RouterError('PROTOCOL', 'Mismatched router parameter arrays.');
      return Object.fromEntries(names.map((key, index) => [String(key), typeof values[index] === 'object' ? '' : String(values[index] ?? '')]));
    });
  }
  return { objects, encodedFields: [...encoded] };
}
function checkStatus(root: Record<string, unknown>): void {
  const status = String(root.IF_ERRORSTR ?? '');
  if (/SessionTimeout/i.test(status)) throw new RouterError('SESSION_EXPIRED', 'Router session expired; no write was retried.');
  if ((status && status !== 'SUCC') || (root.IF_ERRORTYPE && root.IF_ERRORTYPE !== 'SUCC') ||
      (root.IF_ERRORID !== undefined && String(root.IF_ERRORID) !== '0')) {
    // Never echo firmware error text: it can include values supplied by a user.
    throw new RouterError('ROUTER_REJECTED', 'Router rejected the request; no automatic retry or rollback was performed.');
  }
}
/** Decode literals, never execute JavaScript supplied by the router. */
export function decodeLiteral(text: string): string {
  return text.replace(/\\x([a-f\d]{2})|\\u([a-f\d]{4})|\\([nrt"'\\])/gi, (_, hex: string, unicode: string, escape: string) =>
    hex || unicode ? String.fromCharCode(parseInt(hex || unicode, 16)) : ({ n: '\n', r: '\r', t: '\t' }[escape] ?? escape));
}
export function pageToken(body: string): string {
  const matches = [...body.matchAll(/_sessionTmpToken\s*=\s*"((?:[^"\\]|\\.)*)"/g)];
  const match = matches.at(-1)?.[1];
  if (!match) throw new RouterError('SESSION_EXPIRED', 'Missing current page-session token.');
  return decodeLiteral(match);
}
export function publicKey(body: string): string {
  const match = /var\s+pubKey\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(body)?.[1];
  if (!match) throw new RouterError('PROTOCOL', 'Missing firmware request-integrity public key.');
  return decodeLiteral(match);
}
export function challenge(body: string): string {
  if (/<!DOCTYPE|<!ENTITY/i.test(body) || XMLValidator.validate(body) !== true) throw new RouterError('PROTOCOL', 'Invalid login challenge.');
  const result = new XMLParser({ parseTagValue: false }).parse(body) as Record<string, unknown>;
  const values = Object.values(result);
  if (values.length !== 1 || typeof values[0] !== 'string') throw new RouterError('PROTOCOL', 'Unexpected login challenge.');
  return values[0];
}
