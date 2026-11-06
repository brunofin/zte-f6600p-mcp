import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import SwaggerParser from '@apidevtools/swagger-parser';
import { catalog, endpoints } from '../src/client/catalog.js';

test('public catalog covers handler/action counts and only narrowly verified writes',()=>{
  assert.equal(endpoints.length,58);assert.equal(catalog.menuViews.length,29);
  assert.equal(endpoints.reduce((n,e)=>n+e.operations.length,0),128);
  assert.equal(catalog.soapServices.reduce((n,s)=>n+s.actions.length,0),27);
  const writes=endpoints.filter(e=>e.operations.some(o=>o.verified&&o.effect==='configuration_write')).map(e=>e.tag).sort();
  assert.deepEqual(writes,['Localnet_LanMgrIpv4_DHCPBasicCfg_lua.lua','wlan_wlanbasicadconf_lua.lua'].sort());
  for(const e of endpoints) {
    assert.ok(e.operations.length);
    for(const page of e.pages)assert.ok(catalog.menuViews.some(p=>p.page===page));
  }
});
test('OpenAPI validates and describes actual dispatch path, not invented REST resources',async()=>{
  const specification=await SwaggerParser.validate('docs/openapi.json');
  assert.deepEqual(Object.keys(specification.paths??{}),['/']);
  assert.ok('openapi' in specification);
  assert.equal(specification.openapi,'3.1.0');
});
test('client module tree does not import MCP implementation or SDK',async()=>{
  for(const file of ['index','client','crypto','protocol','errors','catalog','tls','soap']) {
    const source=await readFile(`src/client/${file}.ts`,'utf8');
    assert.ok(!source.includes('@modelcontextprotocol')&&!source.includes('../mcp/'));
  }
});
