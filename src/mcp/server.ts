import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { catalog, endpoints, RouterError, type RouterClient } from '../client/index.js';
import { readable } from '../client/catalog.js';
import { redact } from '../client/protocol.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export type RouterApi = Pick<RouterClient, 'read' | 'getDhcp' | 'getWifi' | 'setDhcpRange' | 'set24GHzMode' | 'execute' | 'soap'>;
const readAnnotation = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const writeAnnotation = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };
const fields = z.record(z.string().max(200), z.string().max(4096)).refine(v => Object.keys(v).length <= 100, 'Too many fields');
async function result(run: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const payload = { result: redact(await run()) };
    return { content: [{ type: 'text', text: JSON.stringify(payload) }], structuredContent: payload };
  } catch (error) {
    const payload = { error: { code: error instanceof RouterError ? error.code : 'INTERNAL',
      message: error instanceof RouterError ? error.message : 'Operation failed. No private diagnostic data was returned.' } };
    return { isError: true, content: [{ type: 'text', text: JSON.stringify(payload) }], structuredContent: payload };
  }
}

/** Thin presentation layer. All network/session/write policy belongs to the independent client. */
export function createMcpServer(router: RouterApi): McpServer {
  const server = new McpServer({ name: 'zte-f6600p-mcp', version: '0.1.0' });
  const passiveTags = endpoints.filter(readable).map(e => e.tag) as [string, ...string[]];
  server.registerTool('router_list_endpoints', { description: 'List the public source-derived endpoint catalog and verification status; no router request.',
    annotations: readAnnotation }, async () => result(async () => endpoints.map(e => ({ handler: e.tag, pages: e.pages,
      readVerified: e.readVerified, operations: e.operations.map(o => ({ method: o.method, action: o.action, effect: o.effect, verified: o.verified })) }))));
  server.registerTool('router_read', { description: 'Read a documented passive handler. Active Wi-Fi scans and all actions are excluded. Secrets are redacted.',
    inputSchema: { handler: z.enum(passiveTags), page: z.string().max(100).optional(), query: fields.optional() }, annotations: readAnnotation },
    async ({ handler, page, query }) => result(() => router.read(handler, { page, query })));
  server.registerTool('router_get_dhcp', { description: 'Read current DHCP settings without changing them.', annotations: readAnnotation },
    async () => result(() => router.getDhcp()));
  server.registerTool('router_get_wifi', { description: 'Read radio settings, SSID status and associated clients. Does not start a radio scan.', annotations: readAnnotation },
    async () => result(() => router.getWifi()));
  server.registerTool('router_set_dhcp_range', { description: 'Patch DHCP boundaries only; preserve other settings and verify by fresh read-back. Requires writes enabled and explicit user approval.',
    inputSchema: { start: z.ipv4().optional(), end: z.ipv4().optional(), confirm: z.literal(true) }, annotations: writeAnnotation },
    async args => result(() => router.setDhcpRange(args)));
  server.registerTool('router_set_24ghz_mode', { description: 'Set the existing 20 MHz 2.4 GHz radio to b/g, b/g/n or b/g/n/ax. May briefly restart that radio. Preserve other settings and verify read-back; no 5 GHz changes.',
    inputSchema: { mode: z.enum(['b,g', 'b,g,n', 'b,g,n,ax']), confirm: z.literal(true) }, annotations: writeAnnotation },
    async ({ mode, confirm }) => result(() => router.set24GHzMode(mode, confirm)));
  server.registerTool('router_execute_action', { description: 'Expert wire-level operation from the allowlisted catalog, not a generic patch. Review endpoint fields/hooks first. Requires writes enabled and explicit approval; disruptive actions require a second opt-in. Never assume Cancel means undo.',
    inputSchema: { handler: z.string().max(200), action: z.string().max(100), page: z.string().max(100).optional(),
      parameters: fields.optional(), query: fields.optional(), confirm: z.literal(true) }, annotations: writeAnnotation },
    async args => result(() => router.execute(args)));
  server.registerTool('router_soap_read', { description: 'Call an advertised read-only SOAP action. Requires explicit UPnP origin configuration; some advertised getters are known to fault.',
    inputSchema: { serviceId: z.string().max(200), action: z.string().max(100), parameters: fields.optional() }, annotations: readAnnotation },
    async ({ serviceId, action, parameters }) => result(async () => {
      const descriptor = catalog.soapServices.find(s => s.serviceId === serviceId)?.actions.find(a => a.name === action);
      if (!descriptor || descriptor.effect !== 'read') throw new RouterError('POLICY', 'SOAP read tool accepts only catalog read actions.');
      if (!router.soap) throw new RouterError('CONFIGURATION', 'UPnP origin is not configured.');
      return router.soap.call(serviceId, action, parameters);
    }));
  server.registerTool('router_soap_action', { description: 'Explicit SOAP mutation/action. Requires UPnP configuration, writes enabled, confirmation and additional disruptive-action permission where applicable.',
    inputSchema: { serviceId: z.string().max(200), action: z.string().max(100), parameters: fields.optional(), confirm: z.literal(true) }, annotations: writeAnnotation },
    async ({ serviceId, action, parameters, confirm }) => result(async () => {
      if (!router.soap) throw new RouterError('CONFIGURATION', 'UPnP origin is not configured.');
      return router.soap.call(serviceId, action, parameters, confirm);
    }));
  server.registerResource('endpoint-catalog', 'router://catalog', { mimeType: 'application/json', description: 'Sanitized public endpoint evidence and candidate schemas.' },
    async uri => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(catalog) }] }));
  return server;
}
