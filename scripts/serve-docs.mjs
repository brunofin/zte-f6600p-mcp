import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const files = { '/': ['../docs/index.html', 'text/html'], '/openapi.json': ['../docs/openapi.json', 'application/json'] };
createServer(async (request, response) => {
  const entry = files[request.url];
  if (!entry) { response.writeHead(404).end(); return; }
  try { response.setHeader('content-type', entry[1]); response.end(await readFile(fileURLToPath(new URL(entry[0], import.meta.url)))); }
  catch { response.writeHead(500).end(); }
}).listen(8787, '127.0.0.1', () => process.stderr.write('Read-only API viewer: http://localhost:8787\n'));
