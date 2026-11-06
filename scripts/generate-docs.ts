import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { catalog, endpoints } from '../src/client/catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemas: Record<string, unknown> = {};
const schemaName = (tag: string) => tag.replace(/[^A-Za-z0-9_]/g, '_');
for (const endpoint of endpoints) {
  const fields = new Map(endpoint.bindings.flatMap(b => b.fields).map(f => [f.name, f]));
  const properties = Object.fromEntries([...fields.values()].map(f => [f.name, {
    type: 'string', description: `UI-derived wire-field candidate (${f.controlType}); ${f.encryption}. Requiredness/server constraints unknown.`,
    ...(f.maxLength !== undefined ? { maxLength: f.maxLength } : {}),
    ...(f.enum?.length ? { enum: f.enum } : {}),
    ...(f.sensitive ? { writeOnly: true } : {}),
  }]));
  schemas[schemaName(endpoint.tag)] = { type: 'object', additionalProperties: true,
    description: 'Candidate fields, NOT an executable complete payload. Read current settings and apply firmware-specific preprocessing. Dispatch requires matching _type/_tag query parameters.',
    properties: { IF_ACTION: { type: 'string', description: 'Generic action selector; topology SET_ALIAS instead uses query Action.' },
      _sessionTOKEN: { type: 'string', writeOnly: true }, ...properties } };
}
const openapi = {
  openapi: '3.1.0', jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
  info: { title: 'ZTE F6600P firmware HTTP RPC reference', version: '0.1.0', license: { name: 'MIT', identifier: 'MIT' },
    description: 'Independent, source-derived research for firmware V9.0.10P6N6. Not affiliated with ZTE or an ISP. The actual HTTP API dispatches through / using _type and _tag. This spec does not invent REST paths. See x-router-handlers and endpoints.md for per-handler operation/schema evidence. Candidate schemas are not a guarantee of server validation or permissions. Active GETs can change operational state. No private installation data is included.' },
  servers: [{ url: 'https://router.example.invalid', description: 'Reserved placeholder: configure your own router explicitly.' }],
  paths: { '/': {
    parameters: [
      { name: '_type', in: 'query', required: true, schema: { type: 'string', enum: ['menuView', 'menuData', 'hiddenData', 'loginData'] } },
      { name: '_tag', in: 'query', required: true, schema: { type: 'string', enum: [...new Set([...endpoints.map(e => e.tag), ...catalog.menuViews.map(p => p.page)])] } },
    ],
    get: { operationId: 'getFirmwareHandler', summary: 'Dispatch a page, passive read or explicitly selected active GET',
      description: 'Use the matching handler/page context in x-router-handlers. In particular, wlan_sta_wlan_profile_lua.lua?APGetFrom=ScanAP or ScanAP5g initiates scanning and is NOT a passive read. Some handlers need additional query parameters. HTTP 200 can contain SessionTimeout or an HTML error.',
      parameters: ['TypeUplink', 'pageType', 'InstNum', 'DeveiceType', 'querydir', 'APGetFrom', '_sessionTOKEN'].map(name => ({ name, in: 'query', required: false, schema: { type: 'string' } })),
      responses: { '200': { description: 'XML/JSON data, HTML page, or an application-level error. Validate format/status inside the response.',
        content: { 'text/xml': { schema: { type: 'string' } }, 'text/html': { schema: { type: 'string' } }, 'application/json': { schema: {} } } } } },
    post: { operationId: 'postFirmwareHandler', summary: 'Dispatch login/logout, preferences or an explicit firmware action',
      description: 'Authenticated data writes require a fresh page token and RSA-wrapped SHA-256 Check header over the EXACT form body. Password controls marked by response encode metadata require AES-CBC and wrapped encode key material. Do not retry writes automatically. Query selectors and schema variants must be paired using x-router-handlers. Login/logout use their separately documented payloads, not generic IF_ACTION.',
      parameters: [{ name: 'Check', in: 'header', required: false, schema: { type: 'string' }, description: 'RSA PKCS#1 v1.5 encrypted hexadecimal SHA-256 of exact form body, base64 encoded.' },
        { name: 'Action', in: 'query', required: false, schema: { type: 'string' }, description: 'Topology custom selector: SET_ALIAS.' }],
      requestBody: { required: true, content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', additionalProperties: { type: 'string' } } } } },
      responses: { '200': { description: 'Parse IF_ERRORSTR/IF_ERRORID/IF_ERRORTYPE, not only HTTP status. Fresh GET verification is required after mutations.', content: { 'text/xml': { schema: { type: 'string' } }, 'application/json': { schema: {} } } } } },
  } },
  components: { schemas },
  'x-router-handlers': endpoints,
  'x-router-menu-views': catalog.menuViews,
  'x-router-soap-services': catalog.soapServices,
};

let markdown = '# Endpoint catalog\n\nGenerated from `src/data/endpoints.json`. Run `npm run docs:generate`; do not edit generated files.\n\n' +
  '**Scope:** observed firmware UI/shared-script references, not all possible server handlers. Read/write verification is installation- and firmware-specific. No assumption is made that disabled UI controls imply server authorization.\n\n' +
  `- ${endpoints.length} HTTP handlers; ${catalog.menuViews.length} menu contexts.\n` +
  `- ${endpoints.reduce((n,e) => n+e.operations.length,0)} method/action definitions.\n` +
  `- ${endpoints.filter(e=>e.readVerified).length} handlers with verified reads.\n` +
  `- ${catalog.soapServices.reduce((n,s)=>n+s.actions.length,0)} advertised SOAP actions.\n\n` +
  'Every HTTP handler uses `/?_type=TYPE&_tag=HANDLER`. Additional parameters are listed per binding. Firmware spelling `DeveiceType` is intentional.\n\n';
for (const e of endpoints) {
  markdown += `## \`${e.tag}\`\n\n- Dispatch: \`_type=${e.type}\`\n- Page contexts: ${e.pages.map(p=>'`'+p+'`').join(', ') || 'shared session context; review protocol'}\n- Read verified: **${e.readVerified ? 'yes' : 'not established'}**\n`;
  if(e.encodedFields.length) markdown += '- Response encryption metadata: '+e.encodedFields.map(x=>'`'+x+'`').join(', ')+'\n';
  markdown += '\n| Method | Selector | Effect | Evidence status |\n|---|---|---|---|\n';
  for(const o of e.operations) markdown += `| ${o.method} | ${o.action ? '`'+o.action.parameter+'='+o.action.value+'`' : '—'} | ${o.effect} | ${o.verified?'observed working':'source-derived / untested'} |\n`;
  for(const o of e.operations) {
    if(o.verificationScope)markdown += '\nVerification scope: '+o.verificationScope+'.\n';
    if(o.parameters)markdown += '\nOperation parameters: '+Object.entries(o.parameters).map(([k,v])=>'`'+k+'`: '+v).join('; ')+'.\n';
    if(o.supportsCreateCandidate)markdown += '\nClient UI exposes add-instance support; new entries use `_InstID=-1`. Create/delete remain untested.\n';
  }
  for(const b of e.bindings) {
    markdown += `\n### ${b.section}\n\n`;
    if(Object.keys(b.query).length)markdown += 'Additional query: `'+new URLSearchParams(b.query).toString()+'`.\n\n';
    markdown += '| Wire-field candidate | Control | Sensitive | Encryption evidence |\n|---|---|---|---|\n';
    for(const f of b.fields)markdown += `| \`${f.name}\` | ${f.controlType} | ${f.sensitive?'yes':'no'} | ${f.encryption.replaceAll('|','\\|')} |\n`;
    if(b.hooks.length)markdown += '\nPreprocessing hooks requiring review: '+b.hooks.map(h=>'`'+h+'`').join(', ')+'.\n';
  }
  if(e.observedFields.length)markdown += '\nObserved response field names: '+e.observedFields.map(x=>'`'+x+'`').join(', ')+'.\n';
  markdown += '\n';
}
markdown += '# UPnP SOAP\n\nOpt-in, separate origin/port. No credentials or cookies are forwarded. See SCPD schemas in the JSON catalog for argument names, directions and types. Advertised support is not proof an action works.\n\n';
for(const s of catalog.soapServices) {
  markdown += `## \`${s.serviceType}\`\n\nControl path: \`${s.controlURL}\`; SCPD: \`${s.SCPDURL}\`.\n\n| Action | Inputs | Effect | Observed result |\n|---|---|---|---|\n`;
  for(const a of s.actions)markdown += `| ${a.name} | ${a.arguments.filter(x=>x.direction==='in').map(x=>x.name).join(', ') || 'none'} | ${a.effect} | ${a.verified?'successful read':a.test_http_status===500?'SOAP fault':'untested'} |\n`;
  markdown+='\n';
}
for(const [file,contents] of [['docs/openapi.json',JSON.stringify(openapi,null,2)+'\n'],['docs/endpoints.md',markdown.trimEnd()+'\n']] as const) {
  const destination=path.join(root,file);
  if(process.argv.includes('--check')) {
    if(await readFile(destination,'utf8').catch(()=> '')!==contents)throw new Error(`${file} is stale; regenerate docs.`);
  } else await writeFile(destination,contents);
}
