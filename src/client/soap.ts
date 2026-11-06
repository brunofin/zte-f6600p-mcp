import got, { type Got } from 'got';
import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import { catalog } from './catalog.js';
import { RouterError } from './errors.js';
import { redact } from './protocol.js';
import type { ClientOptions, Fields } from './types.js';
import { pinnedAgent } from './tls.js';
import type { Agent } from 'node:https';

/** Explicit opt-in UPnP origin; intentionally uses no router cookies or login credentials. */
export class SoapClient {
  private readonly http: Got;
  private readonly agent?: Agent;
  constructor(baseUrl: string, routerHostname: string, options: ClientOptions,
    private readonly authorize: (effect: string, confirm: boolean) => void) {
    let url: URL;
    try { url = new URL(baseUrl); } catch { throw new RouterError('CONFIGURATION', 'Invalid explicit UPnP URL.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname !== routerHostname || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new RouterError('CONFIGURATION', 'UPnP must use the configured router host and a root HTTP(S) URL.');
    }
    if (url.protocol === 'https:' && options.certificateSha256) this.agent = pinnedAgent(options.certificateSha256, options.timeoutMs ?? 15_000);
    this.http = got.extend({ prefixUrl: url.href, retry: { limit: 0 }, followRedirect: false, throwHttpErrors: false,
      timeout: { request: options.timeoutMs ?? 15_000 }, responseType: 'text',
      ...(this.agent ? { agent: { https: this.agent } } : {}) });
  }
  async call(serviceId: string, actionName: string, parameters: Fields = {}, confirm = false): Promise<unknown> {
    const service = catalog.soapServices.find(s => s.serviceId === serviceId);
    const action = service?.actions.find(a => a.name === actionName);
    if (!service || !action) throw new RouterError('VALIDATION', 'Unknown SOAP service/action.');
    if (action.effect === 'unknown_do_not_invoke_without_review') throw new RouterError('POLICY', 'Undocumented SOAP behavior is not executable.');
    if (action.effect !== 'read') this.authorize(action.effect, confirm);
    const inputs = action.arguments.filter(a => a.direction === 'in').map(a => a.name);
    if (Object.keys(parameters).some(key => !inputs.includes(key)) || inputs.some(key => parameters[key] === undefined)) {
      throw new RouterError('VALIDATION', 'SOAP arguments must match the documented input argument names.');
    }
    const xml = new XMLBuilder({ ignoreAttributes: false }).build({
      's:Envelope': { '@_xmlns:s': 'http://schemas.xmlsoap.org/soap/envelope/',
        '@_s:encodingStyle': 'http://schemas.xmlsoap.org/soap/encoding/',
        's:Body': { [`u:${actionName}`]: { '@_xmlns:u': service.serviceType, ...parameters } } },
    });
    let body: string;
    try {
      const abort = new AbortController();
      const pending = this.http.post(service.controlURL.replace(/^\//, ''), { body: xml,
        signal: abort.signal,
        headers: { 'content-type': 'text/xml; charset="utf-8"', soapaction: `"${service.serviceType}#${actionName}"` } });
      pending.on('downloadProgress', progress => { if (progress.transferred > 4 * 1024 * 1024) abort.abort(); });
      const result = await pending;
      body = result.body;
      if (![200, 500].includes(result.statusCode)) throw new RouterError('TRANSPORT', 'Unexpected SOAP HTTP status.');
    } catch (error) {
      if (error instanceof RouterError) throw error;
      throw new RouterError('TRANSPORT', 'SOAP transport failed; request was not retried.');
    }
    if (/<!DOCTYPE|<!ENTITY/i.test(body) || XMLValidator.validate(body) !== true) throw new RouterError('PROTOCOL', 'Invalid SOAP XML.');
    const parsed = new XMLParser({ removeNSPrefix: true, parseTagValue: false }).parse(body) as Record<string, unknown>;
    const envelope = parsed.Envelope as Record<string, unknown> | undefined;
    const contents = envelope?.Body as Record<string, unknown> | undefined;
    if (!contents) throw new RouterError('PROTOCOL', 'Missing SOAP response body.');
    if (contents.Fault) throw new RouterError('ROUTER_REJECTED', 'SOAP action returned a fault; request was not retried.');
    const response = contents[`${actionName}Response`];
    if (Object.hasOwn(contents, `${actionName}Response`) && response === '') return {};
    if (!response || typeof response !== 'object') throw new RouterError('PROTOCOL', 'Unexpected SOAP action response.');
    return redact(response);
  }
  close(): void { this.agent?.destroy(); }
}
