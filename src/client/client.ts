import got, { type Got } from 'got';
import type { Agent } from 'node:https';
import { isIP } from 'node:net';
import { CookieJar } from 'tough-cookie';
import { actionFor, catalog, dangerousEffects, endpointFor, readable } from './catalog.js';
import { decryptField, encodeFields, encryptParameters, integrityCheck, sha256 } from './crypto.js';
import { RouterError } from './errors.js';
import { challenge, isEncodedField, pageToken, parseResponse, publicKey, safeResponse, secretName } from './protocol.js';
import { pinnedAgent } from './tls.js';
import type { ActionRequest, ActionResult, Change, ClientOptions, Endpoint, Fields, Query, ReadOptions, RouterResponse, VerifiedUpdate } from './types.js';
import { SoapClient } from './soap.js';

const RESERVED = new Set(['_type', '_tag', '_sessionTOKEN', 'IF_ACTION', 'encode', 'Check']);
export const DHCP = 'Localnet_LanMgrIpv4_DHCPBasicCfg_lua.lua';
export const RADIO = 'wlan_wlanbasicadconf_lua.lua';
export const SSID = 'wlan_wlansssidconf_lua.lua';

/** No MCP imports, global configuration, persistent cookies, logging or auto-discovery. */
export class RouterClient {
  private readonly http: Got;
  private readonly jar = new CookieJar();
  private readonly agent?: Agent;
  private readonly origin: string;
  private loggedIn = false;
  private publicKey = '';
  private currentPageToken = '';
  readonly soap?: SoapClient;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly options: ClientOptions) {
    let base: URL;
    try { base = new URL(options.baseUrl); } catch { throw new RouterError('CONFIGURATION', 'A valid router base URL is required.'); }
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
      throw new RouterError('CONFIGURATION', 'Use a root HTTP(S) URL without credentials, query or fragment.');
    }
    if (!options.username || !options.password) throw new RouterError('CONFIGURATION', 'Router credentials are required.');
    if (options.certificateSha256 && base.protocol !== 'https:') throw new RouterError('CONFIGURATION', 'Certificate pinning requires HTTPS.');
    this.origin = base.origin;
    const timeoutMs = options.timeoutMs ?? 15_000;
    if (options.certificateSha256) this.agent = pinnedAgent(options.certificateSha256, timeoutMs);
    this.http = got.extend({
      prefixUrl: base.href, cookieJar: this.jar, retry: { limit: 0 },
      timeout: { request: timeoutMs }, followRedirect: false, throwHttpErrors: false,
      responseType: 'text',
      ...(this.agent ? { agent: { https: this.agent } } : {}),
    });
    if (options.upnpBaseUrl) {
      this.soap = new SoapClient(options.upnpBaseUrl, base.hostname, options, (effect, confirm) => this.authorize(effect, confirm));
    }
  }

  private transaction<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn);
    this.queue = next.catch(() => undefined);
    return next;
  }
  private async request(query: Query = {}, body?: string, headers: Fields = {}): Promise<string> {
    try {
      const abort = new AbortController();
      const pending = this.http('', { method: body === undefined ? 'GET' : 'POST', searchParams: query,
        body, signal: abort.signal, headers: { ...headers, ...(body !== undefined ? { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' } : {}) } });
      pending.on('downloadProgress', progress => { if (progress.transferred > 4 * 1024 * 1024) abort.abort(); });
      const result = await pending;
      if (result.statusCode !== 200) throw new RouterError('TRANSPORT', 'Unexpected router HTTP status; request was not retried.');
      return result.body;
    } catch (error) {
      if (error instanceof RouterError) throw error;
      // got errors contain request options (and thus credentials/tokens). Never propagate them.
      throw new RouterError('TRANSPORT', 'Router transport failed; check connectivity and TLS trust. Request was not retried.');
    }
  }
  private async ensureLogin(): Promise<void> {
    if (this.loggedIn) return;
    await this.jar.removeAllCookies();
    await this.request();
    let entry: Record<string, unknown>;
    try { entry = JSON.parse(await this.request({ _type: 'loginData', _tag: 'login_entry' })) as Record<string, unknown>; }
    catch (error) { if (error instanceof RouterError) throw error; throw new RouterError('PROTOCOL', 'Invalid login state.'); }
    if (typeof entry.sess_token !== 'string') throw new RouterError('PROTOCOL', 'Missing login-session token.');
    const nonce = challenge(await this.request({ _type: 'loginData', _tag: 'login_token' }));
    let result: Record<string, unknown>;
    try {
      result = JSON.parse(await this.request({ _type: 'loginData', _tag: 'login_entry' }, encodeFields({
        action: 'login', Username: this.options.username, Password: sha256(this.options.password + nonce), _sessionTOKEN: entry.sess_token,
      }))) as Record<string, unknown>;
    } catch (error) { if (error instanceof RouterError) throw error; throw new RouterError('PROTOCOL', 'Invalid login response.'); }
    if (result.login_need_refresh !== true && result.login_need_refresh !== 1) throw new RouterError('AUTHENTICATION', 'Router did not accept the supplied credentials.');
    this.publicKey = publicKey(await this.request());
    this.loggedIn = true;
  }
  private selectPage(endpoint: Endpoint, requested?: string): string | undefined {
    const page = requested ?? endpoint.pages[0];
    if (page && (!catalog.menuViews.some(p => p.page === page) || (endpoint.pages.length && !endpoint.pages.includes(page)))) {
      throw new RouterError('VALIDATION', 'Page is not a documented context for this handler.');
    }
    return page;
  }
  private validateQuery(query: Query): void {
    if (Object.keys(query).some(key => RESERVED.has(key) || key === 'Action' || key === 'APGetFrom')) {
      throw new RouterError('VALIDATION', 'Reserved routing or action parameter is not permitted here.');
    }
  }
  private query(endpoint: Endpoint, options: ReadOptions): Query {
    const extras = options.query ?? {};
    this.validateQuery(extras);
    const allowed = new Set([
      ...endpoint.bindings.flatMap(binding => Object.keys(binding.query)),
      ...endpoint.operations.filter(operation => operation.method === 'GET').flatMap(operation => Object.keys(operation.parameters ?? {})),
    ]);
    if (Object.keys(extras).some(key => !allowed.has(key))) {
      throw new RouterError('VALIDATION', 'Query parameter is not documented for this handler.');
    }
    return { _type: endpoint.type, _tag: endpoint.tag, ...(endpoint.bindings[0]?.query ?? {}), ...extras };
  }
  private async context(endpoint: Endpoint, options: ReadOptions): Promise<string> {
    const page = this.selectPage(endpoint, options.page);
    await this.ensureLogin();
    if (!page) return '';
    const body = await this.request({ _type: 'menuView', _tag: page });
    try { this.currentPageToken = pageToken(body); return this.currentPageToken; }
    catch (error) { this.loggedIn = false; throw error; }
  }
  private parse(body: string): RouterResponse {
    try { return parseResponse(body); }
    catch (error) { if (error instanceof RouterError && error.code === 'SESSION_EXPIRED') this.loggedIn = false; throw error; }
  }
  private async readRaw(endpoint: Endpoint, options: ReadOptions): Promise<RouterResponse> {
    if (!readable(endpoint)) throw new RouterError('POLICY', 'Handler is not a passive read. Use an explicit action for active operations.');
    const query = this.query(endpoint, options);
    await this.context(endpoint, options);
    return this.parse(await this.request(query));
  }
  async read(handler: string, options: ReadOptions = {}): Promise<RouterResponse> {
    const endpoint = endpointFor(handler);
    // Preflight before opening a session.
    if (!readable(endpoint)) throw new RouterError('POLICY', 'Handler is not a passive read.');
    this.query(endpoint, options); this.selectPage(endpoint, options.page);
    return this.transaction(async () => safeResponse(await this.readRaw(endpoint, options)));
  }
  private authorize(effect: string, confirm: boolean): void {
    if (!this.options.allowWrites || confirm !== true) throw new RouterError('POLICY', 'Writes/actions require allowWrites and explicit confirmation.');
    if (dangerousEffects.has(effect) && !this.options.allowDangerousActions) throw new RouterError('POLICY', 'This operational action also requires allowDangerousActions.');
  }
  private async actionRaw(request: ActionRequest): Promise<RouterResponse> {
    const endpoint = endpointFor(request.handler);
    const operation = actionFor(endpoint, request.action);
    this.authorize(operation.effect, request.confirm);
    const fields = { ...request.parameters };
    this.validateQuery(fields);
    const query = this.query(endpoint, request);
    const metadataQuery = { ...query };
    const token = await this.context(endpoint, request);
    if (!token) throw new RouterError('PROTOCOL', 'An explicit page context is required for actions.');
    if (operation.action!.parameter.startsWith('query:')) query[operation.action!.parameter.slice(6)] = request.action;
    else fields[operation.action!.parameter] = request.action;
    if (operation.method === 'GET') {
      if (Object.keys(fields).length) throw new RouterError('VALIDATION', 'GET action accepts query parameters, not a body.');
      query._sessionTOKEN = token;
      return this.parse(await this.request(query));
    }
    // Runtime response metadata can mark passwords even when no value is returned.
    let encoded = endpoint.encodedFields;
    if (readable(endpoint)) {
      const snapshot = this.parse(await this.request(metadataQuery));
      encoded = [...new Set([...encoded, ...snapshot.encodedFields])];
      if (endpoint.tag === 'devauth_accountmgr_lua.lua' && fields.Right !== undefined) {
        const current = snapshot.objects.OBJ_USERINFO_ID?.find(instance => instance._InstID === fields._InstID);
        if (!current || current.Right !== fields.Right) {
          throw new RouterError('POLICY', 'Account privilege bits may only be preserved, not changed.');
        }
      }
    }
    encoded = Object.keys(fields).filter(name => encoded.some(prefix => name.startsWith(prefix)) &&
      !endpoint.bindings.some(binding => binding.fields.some(field => field.name === name && ['select', 'checkbox'].includes(field.controlType))));
    if (Object.keys(fields).some(key => secretName.test(key) && !encoded.some(prefix => key.startsWith(prefix)))) {
      throw new RouterError('VALIDATION', 'Secret field has no known firmware encryption metadata; refusing plaintext transmission.');
    }
    const encrypted = encryptParameters(fields, encoded, this.publicKey);
    const body = encodeFields({ ...encrypted, _sessionTOKEN: token });
    return this.parse(await this.request(query, body, { Check: integrityCheck(body, this.publicKey), Origin: this.origin, Referer: `${this.origin}/`, 'X-Requested-With': 'XMLHttpRequest' }));
  }
  async execute(request: ActionRequest): Promise<ActionResult> {
    const endpoint = endpointFor(request.handler);
    this.authorize(actionFor(endpoint, request.action).effect, request.confirm);
    return this.transaction(async () => {
      const response = safeResponse(await this.actionRaw(request));
      if (readable(endpoint) && actionFor(endpoint, request.action).effect === 'configuration_write') {
        try {
          return { response, readBack: safeResponse(await this.readRaw(endpoint, request)),
            verification: 'Fresh read-back supplied; raw operation semantics and preservation must be checked by the caller.' };
        } catch {
          throw new RouterError('VERIFICATION', 'Action may have applied, but fresh read-back failed. Do not retry blindly.');
        }
      }
      return { response, verification: 'No safe automatic state verification is defined for this operational action.' };
    });
  }
  async getDhcp(): Promise<RouterResponse> { return this.read(DHCP); }
  async getWifi(): Promise<{ radios: RouterResponse; status: RouterResponse; clients: RouterResponse }> {
    // The same serialization queue also protects callers using Promise.all.
    const [radios, status, clients] = await Promise.all([
      this.read(RADIO), this.read('wlan_wlanstatus_lua.lua'), this.read('wlan_client_stat_lua.lua'),
    ]);
    return { radios, status, clients };
  }
  async setDhcpRange(patch: { start?: string; end?: string; confirm: boolean }): Promise<VerifiedUpdate> {
    this.authorize('configuration_write', patch.confirm);
    if (!patch.start && !patch.end) throw new RouterError('VALIDATION', 'At least one DHCP boundary is required.');
    for (const value of [patch.start, patch.end]) if (value !== undefined && isIP(value) !== 4) throw new RouterError('VALIDATION', 'DHCP boundaries must be IPv4 addresses.');
    return this.transaction(async () => {
      const endpoint = endpointFor(DHCP);
      const before = await this.readRaw(endpoint, {});
      const main = before.objects.OBJ_Br0AndDhcpsHosCfg_ID?.[0];
      const option = before.objects.OBJ_OPTTFTPSERV_ID?.[0];
      if (!main || !option) throw new RouterError('PROTOCOL', 'Expected DHCP objects are missing.');
      const start = patch.start ?? main.MinAddress!, end = patch.end ?? main.MaxAddress!;
      validateRange(start, end, main.IPAddr!, main.SubMask!);
      const fields: Fields = { IF_URL_HOST: new URL(this.origin).hostname, _InstID: option._InstID!, IPRouters: '' };
      for (const key of ['IPAddr', 'SubMask', 'SubnetMask', 'MinAddress', 'MaxAddress', 'DNSServer1', 'DNSServer2', 'LeaseTime', 'ServerEnable', 'DnsServerSource']) {
        if (main[key] === undefined) throw new RouterError('PROTOCOL', 'Missing preserved DHCP setting.');
        fields[key] = main[key];
      }
      for (const key of ['OptEnable', 'OptCode', 'OptValue']) {
        if (option[key] === undefined) throw new RouterError('PROTOCOL', 'Missing preserved DHCP option setting.');
        fields[key] = option[key];
      }
      fields.MinAddress = start; fields.MaxAddress = end;
      await this.actionRaw({ handler: DHCP, action: 'Apply', parameters: fields, confirm: true });
      const after = await this.readRaw(endpoint, {});
      const differences = changes(before, after);
      if (after.objects.OBJ_Br0AndDhcpsHosCfg_ID?.[0]?.MinAddress !== start || after.objects.OBJ_Br0AndDhcpsHosCfg_ID?.[0]?.MaxAddress !== end ||
          differences.some(c => c.object !== 'OBJ_Br0AndDhcpsHosCfg_ID' || !['MinAddress', 'MaxAddress'].includes(c.field))) {
        throw new RouterError('VERIFICATION', 'DHCP write may have applied, but read-back differs from the requested patch. Do not retry blindly.');
      }
      return { changes: differences, settings: safeResponse(after) };
    });
  }
  async set24GHzMode(mode: 'b,g' | 'b,g,n' | 'b,g,n,ax', confirm: boolean): Promise<VerifiedUpdate> {
    this.authorize('configuration_write', confirm);
    if (!['b,g', 'b,g,n', 'b,g,n,ax'].includes(mode)) throw new RouterError('VALIDATION', 'Unsupported mixed radio mode.');
    return this.transaction(async () => {
      const endpoint = endpointFor(RADIO);
      const before = await this.readRaw(endpoint, {});
      const radios = before.objects.OBJ_WLANSETTING_ID ?? [];
      const radio = radios.find(r => r.Band === '2.4GHz');
      if (!radio || radio.BandWidth !== '20MHz') throw new RouterError('VALIDATION', 'This verified helper supports only an existing 20 MHz 2.4 GHz radio.');
      const ssidBefore = await this.readRaw(endpointFor(SSID), {});
      const ssidBeforeDigest = snapshotDigest(ssidBefore, this.currentPageToken);
      const fields: Fields = {};
      for (const key of ['_InstID', 'BasicDataRates', 'OpDataRates', '11nMode', 'GreenField', 'AutoChannelEnabled', 'Band', 'Channel', 'Standard', 'BandWidth', 'PreambleType']) {
        if (radio[key] === undefined) throw new RouterError('PROTOCOL', 'Missing preserved radio setting.');
        fields[key] = radio[key];
      }
      fields.Standard = mode; fields['11nMode'] = mode === 'b,g' ? '0' : '1';
      fields.GreenField = '0'; fields.BasicDataRates = '1,2,5.5,11';
      fields.OpDataRates = '1,2,5.5,11,6,9,12,18,24,36,48,54';
      await this.actionRaw({ handler: RADIO, action: 'Apply', parameters: fields, confirm: true });
      const after = await this.readRaw(endpoint, {});
      const afterRadio = after.objects.OBJ_WLANSETTING_ID?.find(r => r._InstID === radio._InstID);
      // Ignore channel-list response objects; compare every returned radio field.
      const differences = changes({ objects: { OBJ_WLANSETTING_ID: radios }, encodedFields: [] },
        { objects: { OBJ_WLANSETTING_ID: after.objects.OBJ_WLANSETTING_ID ?? [] }, encodedFields: [] });
      const ssidAfter = await this.readRaw(endpointFor(SSID), {});
      const permitted = new Set(['Standard', '11nMode', 'GreenField', 'BasicDataRates', 'OpDataRates']);
      const ssidAfterDigest = snapshotDigest(ssidAfter, this.currentPageToken);
      if (afterRadio?.Standard !== mode || afterRadio['11nMode'] !== fields['11nMode'] ||
          differences.some(c => c.instance !== radio._InstID || !permitted.has(c.field)) || ssidBeforeDigest !== ssidAfterDigest) {
        throw new RouterError('VERIFICATION', 'Radio write may have applied, but read-back differs from the requested change. Do not retry blindly.');
      }
      return { changes: differences, settings: safeResponse(after) };
    });
  }
  async logout(): Promise<void> {
    return this.transaction(async () => {
      try { if (this.loggedIn) await this.request({ _type: 'loginData', _tag: 'logout_entry' }, 'IF_LogOff=1'); }
      finally { this.loggedIn = false; this.publicKey = ''; this.currentPageToken = ''; await this.jar.removeAllCookies(); }
    });
  }
  async close(): Promise<void> {
    try { await this.logout(); } finally { this.agent?.destroy(); this.soap?.close(); }
  }
}

function snapshotDigest(response: RouterResponse, token: string): string {
  const values = Object.entries(response.objects).sort(([a], [b]) => a.localeCompare(b)).map(([object, instances]) => [
    object, instances.map(instance => Object.entries(instance).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [
      key, isEncodedField(key, response.encodedFields) ? sha256(decryptField(value, token)) : value,
    ])),
  ]);
  return sha256(JSON.stringify(values));
}

function ipv4(value: string): number {
  if (isIP(value) !== 4) throw new RouterError('VALIDATION', 'Expected an IPv4 address.');
  return value.split('.').reduce((n, v) => ((n << 8) | Number(v)) >>> 0, 0);
}
export function validateRange(start: string, end: string, gateway: string, mask: string): void {
  const [a,b,g,m] = [start,end,gateway,mask].map(ipv4) as [number,number,number,number];
  const network = (g & m) >>> 0, broadcast = (network | ~m) >>> 0;
  const inverse = (~m) >>> 0;
  if (((inverse & (inverse + 1)) >>> 0) !== 0 || a > b || a <= network || b >= broadcast ||
      ((a & m) >>> 0) !== network || ((b & m) >>> 0) !== network || (a <= g && b >= g)) {
    throw new RouterError('VALIDATION', 'DHCP range must be ordered, inside the current subnet, and exclude gateway/network/broadcast addresses.');
  }
}
export function changes(before: RouterResponse, after: RouterResponse): Change[] {
  const differences: Change[] = [];
  for (const name of new Set([...Object.keys(before.objects), ...Object.keys(after.objects)])) {
    const old = before.objects[name] ?? [], next = after.objects[name] ?? [];
    const ids = new Set([...old, ...next].map((r, i) => r._InstID ?? String(i)));
    for (const id of ids) {
      const a = old.find((r, i) => (r._InstID ?? String(i)) === id) ?? {};
      const b = next.find((r, i) => (r._InstID ?? String(i)) === id) ?? {};
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[key] !== b[key]) {
        differences.push({ object: name, instance: id, field: key,
          before: secretName.test(key) ? '[REDACTED]' : a[key], after: secretName.test(key) ? '[REDACTED]' : b[key] });
      }
    }
  }
  return differences;
}
