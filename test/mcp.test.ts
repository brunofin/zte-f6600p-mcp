import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createMcpServer } from '../src/mcp/server.js';
import { RouterClient } from '../src/client/index.js';
import { mockRouter } from './mock-router.js';

async function setup(t:{after(fn:()=>Promise<void>):void}) {
  const mock=await mockRouter();
  const router=new RouterClient({baseUrl:mock.baseUrl,username:'example-user',password:'example-login-password'});
  const server=createMcpServer(router);
  const client=new Client({name:'synthetic-mcp-test',version:'0.0.0'});
  const [a,b]=InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a),client.connect(b)]);
  t.after(async()=>{await client.close();await server.close();await router.close();await mock.close();});
  return {client,mock};
}
test('real MCP transport lists typed tools, annotations and public catalog resource',async t=>{
  const {client,mock}=await setup(t);
  const tools=await client.listTools();
  assert.equal(tools.tools.length,9);
  assert.equal(tools.tools.find(x=>x.name==='router_read')?.annotations?.readOnlyHint,true);
  assert.equal(tools.tools.find(x=>x.name==='router_set_dhcp_range')?.annotations?.destructiveHint,true);
  const resource=await client.readResource({uri:'router://catalog'});
  assert.ok(resource.contents.length);
  assert.equal(mock.requests.length,0);
});
test('MCP calls use the client and return structured redacted results',async t=>{
  const {client}=await setup(t);
  const response=await client.callTool({name:'router_read',arguments:{handler:'devmgr_statusmgr_lua.lua'}});
  assert.ok(!response.isError);
  const body=JSON.stringify(response);
  assert.ok(body.includes('[REDACTED]'));assert.ok(!body.includes('SYNTHETIC-SERIAL'));
});
test('MCP mutations remain blocked when the core client is read-only',async t=>{
  const {client,mock}=await setup(t);
  const response=await client.callTool({name:'router_set_dhcp_range',arguments:{start:'198.51.100.21',confirm:true}});
  assert.equal(response.isError,true);assert.match(JSON.stringify(response),/POLICY/);
  assert.equal(mock.requests.length,0);
});
test('missing explicit confirmation cannot trigger a mutation',async t=>{
  const {client,mock}=await setup(t);
  try {
    const response=await client.callTool({name:'router_set_24ghz_mode',arguments:{mode:'b,g,n'}});
    assert.equal(response.isError,true);
  } catch(error) { assert.ok(error instanceof Error); }
  assert.equal(mock.requests.length,0);
});
test('stdio entrypoint supports an actual MCP subprocess against a synthetic router',async t=>{
  const mock=await mockRouter();
  let client: Client | undefined;
  t.after(async()=>{await client?.close();await mock.close();});
  const transport=new StdioClientTransport({command:process.execPath,args:['--import','tsx','src/mcp/index.ts'],
    env:{ROUTER_BASE_URL:mock.baseUrl,ROUTER_USERNAME:'example-user',ROUTER_PASSWORD:'example-login-password',ROUTER_ALLOW_WRITES:'false'},stderr:'pipe'});
  client=new Client({name:'synthetic-stdio-test',version:'0.0.0'});
  await client.connect(transport);
  const response=await client.callTool({name:'router_get_dhcp',arguments:{}});
  assert.ok(!response.isError);assert.match(JSON.stringify(response),/198\.51\.100\.20/);
  assert.equal(mock.state.writes,0);
});
