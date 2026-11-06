import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { RouterClient, RouterError } from '../client/index.js';
import { createMcpServer } from './server.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new RouterError('CONFIGURATION', `${name} is required.`);
  return value;
}
try {
  const router = new RouterClient({ baseUrl: required('ROUTER_BASE_URL'), username: required('ROUTER_USERNAME'),
    password: required('ROUTER_PASSWORD'), certificateSha256: process.env.ROUTER_TLS_SHA256,
    upnpBaseUrl: process.env.ROUTER_UPNP_BASE_URL, allowWrites: process.env.ROUTER_ALLOW_WRITES === 'true',
    allowDangerousActions: process.env.ROUTER_ALLOW_DANGEROUS_ACTIONS === 'true' });
  const server = createMcpServer(router);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    try { await router.close(); } catch { /* Never log transport options. */ }
    await server.close();
  };
  process.once('SIGINT', () => { void stop().finally(() => process.exit(0)); });
  process.once('SIGTERM', () => { void stop().finally(() => process.exit(0)); });
  process.stdin.once('end', () => { void stop(); });
  await server.connect(new StdioServerTransport());
} catch (error) {
  process.stderr.write(`${error instanceof RouterError ? error.message : 'MCP startup failed.'}\n`);
  process.exitCode = 1;
}
