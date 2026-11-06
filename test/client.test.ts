import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RouterClient, RouterError, DHCP, RADIO, SSID, validateRange } from '../src/client/index.js';
import { mockRouter } from './mock-router.js';

async function fixture(t: { after(fn:()=>Promise<void>):void }, options: Partial<ConstructorParameters<typeof RouterClient>[0]> = {}) {
  const mock=await mockRouter();
  let client: RouterClient | undefined;
  t.after(async()=>{await client?.close().catch(()=>undefined);await mock.close();});
  client=new RouterClient({baseUrl:mock.baseUrl,username:'example-user',password:'example-login-password',...options});
  return {mock,client};
}
const code=(expected:string)=>(error:unknown)=>error instanceof RouterError&&error.code===expected;

test('login uses challenge hash, isolated cookies and fresh page context',async t=>{
  const {client,mock}=await fixture(t);
  const result=await client.getDhcp();
  assert.equal(result.objects.OBJ_Br0AndDhcpsHosCfg_ID?.[0]?.MinAddress,'198.51.100.20');
  assert.equal(mock.state.loginCount,1);assert.equal(mock.state.contextFailures,0);
  assert.ok(mock.requests.some(r=>r.type==='menuView'&&r.tag==='lanMgrIpv4'));
  assert.ok(!mock.requests.some(r=>r.body.includes('example-login-password')));
});
test('concurrent callers cannot interleave server-side page contexts',async t=>{
  const {client,mock}=await fixture(t);
  await Promise.all([client.getDhcp(),client.getWifi(),client.read('devmgr_statusmgr_lua.lua'),client.getDhcp()]);
  assert.equal(mock.state.contextFailures,0);assert.equal(mock.state.loginCount,1);
});
test('default write policy blocks before any network request',async t=>{
  const {client,mock}=await fixture(t);
  await assert.rejects(client.setDhcpRange({start:'198.51.100.21',confirm:true}),code('POLICY'));
  assert.equal(mock.requests.length,0);
});
test('confirmation is required even when writes are enabled',async t=>{
  const {client,mock}=await fixture(t,{allowWrites:true});
  await assert.rejects(client.set24GHzMode('b,g,n',false),code('POLICY'));
  assert.equal(mock.requests.length,0);
});
test('DHCP helper signs exact payload and changes only requested boundary despite disabled UI',async t=>{
  const {client,mock}=await fixture(t,{allowWrites:true});
  const before={...mock.state.dhcp};
  const result=await client.setDhcpRange({start:'198.51.100.21',confirm:true});
  assert.deepEqual(mock.state.dhcp,{...before,MinAddress:'198.51.100.21'});
  assert.deepEqual(result.changes.map(c=>c.field),['MinAddress']);
  assert.equal(mock.state.badChecks,0);assert.equal(mock.state.writes,1);
  const sent=mock.requests.find(r=>r.method==='POST'&&r.tag===DHCP)!;
  assert.equal(new URLSearchParams(sent.body).get('_InstID'),'DEV.V4DP.Sr.Pl1.Op1');
  assert.equal(new URLSearchParams(sent.body).get('OptValue'),'');
});
test('DHCP validation rejects invalid, reversed, out-of-subnet and gateway ranges',()=>{
  for(const [start,end] of [['198.51.100.30','198.51.100.20'],['198.51.100.0','198.51.100.20'],['198.51.100.20','198.51.100.255'],['198.51.100.1','198.51.100.20'],['203.0.113.20','203.0.113.30'],['not-an-ip','198.51.100.30']]) {
    assert.throws(()=>validateRange(start!,end!,'198.51.100.1','255.255.255.0'),code('VALIDATION'));
  }
  validateRange('198.51.100.20','198.51.100.200','198.51.100.1','255.255.255.0');
});
test('radio helper normalizes b/g/n, preserves 5GHz and compares keys across page tokens',async t=>{
  const {client,mock}=await fixture(t,{allowWrites:true});
  const five={...mock.state.radios[1]};
  const result=await client.set24GHzMode('b,g,n',true);
  assert.equal(mock.state.radios[0]!.Standard,'b,g,n');assert.equal(mock.state.radios[0]!['11nMode'],'1');
  assert.deepEqual(mock.state.radios[1],five);
  assert.deepEqual(result.changes.map(c=>c.field).sort(),['11nMode','Standard']);
  assert.ok(!mock.requests.some(r=>r.tag===SSID&&r.method==='POST'));
  assert.equal(mock.state.badChecks,0);
});
test('radio helper detects unintended changes to the other band',async t=>{
  const {client,mock}=await fixture(t,{allowWrites:true});mock.state.corruptRadioReadBack=true;
  await assert.rejects(client.set24GHzMode('b,g,n',true),code('VERIFICATION'));
  assert.equal(mock.state.writes,1);
});
test('radio verification detects an actual password change without returning the password',async t=>{
  const {client,mock}=await fixture(t,{allowWrites:true});mock.state.changeSsidOnRadioWrite=true;
  await assert.rejects(client.set24GHzMode('b,g,n',true),error=>code('VERIFICATION')(error)&&!String(error).includes(mock.state.wifiSecret));
  assert.equal(mock.state.writes,1);
});
test('active GET and action-selector query overrides cannot bypass passive reads',async t=>{
  const {client,mock}=await fixture(t);
  await assert.rejects(client.read('wlan_sta_wlan_profile_lua.lua'),code('POLICY'));
  await assert.rejects(client.read(RADIO,{query:{APGetFrom:'ScanAP'}}),code('VALIDATION'));
  await assert.rejects(client.read(RADIO,{query:{_tag:'db_resetmgr_lua.lua'}}),code('VALIDATION'));
  await assert.rejects(client.read(RADIO,{query:{undocumentedSelector:'example'}}),code('VALIDATION'));
  assert.equal(mock.requests.length,0);
});
test('unknown handlers/actions and disruptive operations are rejected',async t=>{
  const {client,mock}=await fixture(t,{allowWrites:true});
  await assert.rejects(client.read('invented-handler'),code('VALIDATION'));
  await assert.rejects(client.execute({handler:RADIO,action:'invented',confirm:true}),code('VALIDATION'));
  await assert.rejects(client.execute({handler:'db_resetmgr_lua.lua',action:'Reset',confirm:true}),code('POLICY'));
  assert.equal(mock.requests.length,0);
});
test('WAN read preserves mandatory query parameters',async t=>{
  const {client}=await fixture(t);
  const result=await client.read('wan_internetstatus_lua.lua');
  assert.equal(result.objects.OBJ_WAN_ID?.[0]?.ConnStatus,'Connected');
});
test('HTTP200 session errors invalidate session, but no write is retried',async t=>{
  const {client,mock}=await fixture(t,{allowWrites:true});
  await client.getDhcp();mock.state.expireNextWrite=true;
  await assert.rejects(client.setDhcpRange({start:'198.51.100.21',confirm:true}),code('SESSION_EXPIRED'));
  assert.equal(mock.state.writes,1);
  assert.equal(mock.state.dhcp.MinAddress,'198.51.100.21');
  await client.getDhcp();assert.equal(mock.state.loginCount,2);assert.equal(mock.state.writes,1);
});
test('HTTP200 HTML SessionTimeout is not treated as successful data',async t=>{
  const {client,mock}=await fixture(t);await client.getDhcp();mock.state.expireNextRead=true;
  await assert.rejects(client.getDhcp(),code('SESSION_EXPIRED'));
});
test('router error text is not exposed through exceptions',async t=>{
  const {client,mock}=await fixture(t,{allowWrites:true});mock.state.failWrite=true;
  await assert.rejects(client.setDhcpRange({start:'198.51.100.21',confirm:true}),error=>code('ROUTER_REJECTED')(error)&&!String(error).includes('example-secret-server-error'));
  assert.equal(mock.state.writes,1);
});
test('public reads redact keys, metadata-encrypted fields and serial numbers',async t=>{
  const {client,mock}=await fixture(t);
  const ssid=await client.read(SSID);
  assert.equal(ssid.objects.OBJ_WLANPSK_ID?.[0]?.KeyPassphrase,'[REDACTED]');
  assert.equal(ssid.objects.OBJ_WLANAP_ID?.[0]?.WEPKeyIndex,'1');
  const health=await client.read('devmgr_statusmgr_lua.lua');
  assert.equal(health.objects.OBJ_DEVINFO_ID?.[0]?.SerialNumber,'[REDACTED]');
  assert.ok(!JSON.stringify(ssid).includes(mock.state.wifiSecret));
});
test('generic account action encrypts omitted-from-read password fields from runtime metadata',async t=>{
  const {client,mock}=await fixture(t,{allowWrites:true});
  const result=await client.execute({handler:'devauth_accountmgr_lua.lua',action:'Apply',parameters:{_InstID:'IGD',Password:'example-old-key',NewPassword:'example-new-key'},confirm:true});
  assert.ok(result.readBack);
  const sent=mock.requests.find(r=>r.tag==='devauth_accountmgr_lua.lua'&&r.method==='POST')!;
  assert.ok(!sent.body.includes('example-old-key')&&!sent.body.includes('example-new-key'));
  const params=new URLSearchParams(sent.body);
  assert.equal(mock.decryptInput(params.get('Password')!,params.get('encode')!),'example-old-key');
  assert.equal(mock.decryptInput(params.get('NewPassword')!,params.get('encode')!),'example-new-key');
  assert.equal(mock.state.badChecks,0);
});
test('custom topology selector is a query action, not IF_ACTION, and read-back uses passive query',async t=>{
  const {client,mock}=await fixture(t,{allowWrites:true});
  await client.execute({handler:'topo_lua.lua',action:'SET_ALIAS',parameters:{InstIdentity:'example-instance',Alias:'Example alias & punctuation'},confirm:true});
  const sent=mock.requests.find(r=>r.tag==='topo_lua.lua'&&r.method==='POST')!;
  assert.equal(sent.query.get('Action'),'SET_ALIAS');assert.equal(new URLSearchParams(sent.body).get('IF_ACTION'),null);
  assert.equal(new URLSearchParams(sent.body).get('Alias'),'Example alias & punctuation');
  assert.ok(mock.requests.filter(r=>r.tag==='topo_lua.lua'&&r.method==='GET').every(r=>!r.query.has('Action')));
});
test('account privilege bits cannot be elevated through generic expert actions',async t=>{
  const {client,mock}=await fixture(t,{allowWrites:true});
  await assert.rejects(client.execute({handler:'devauth_accountmgr_lua.lua',action:'Apply',parameters:{_InstID:'IGD',Right:'1'},confirm:true}),code('POLICY'));
  assert.equal(mock.state.writes,0);
});
test('base URL cannot include credentials, non-root paths, query or unsupported protocol',()=>{
  for(const baseUrl of ['file:///tmp/example','https://example.invalid/somewhere','https://user:pass@example.invalid/','https://example.invalid/?_tag=x']) {
    assert.throws(()=>new RouterClient({baseUrl,username:'example',password:'example'}),code('CONFIGURATION'));
  }
});
test('optional SOAP uses SCPD allowlist and never sends authentication cookies',async t=>{
  const mock=await mockRouter();
  const client=new RouterClient({baseUrl:mock.baseUrl,upnpBaseUrl:mock.baseUrl,username:'example-user',password:'example-login-password'});
  t.after(async()=>{await client.close();await mock.close();});
  await client.getDhcp();
  const result=await client.soap!.call('urn:upnp-org:serviceId:WANIPConn1','GetExternalIPAddress') as Record<string,string>;
  assert.equal(result.NewExternalIPAddress,'203.0.113.10');
  assert.equal(mock.requests.at(-1)!.cookie,'');
  await assert.rejects(client.soap!.call('urn:upnp-org:serviceId:WANIPConn1','AddPortMapping',{},true),code('POLICY'));
  await assert.rejects(client.soap!.call('urn:microsoft-com:serviceId:OSInfo1','MagicOn'),code('POLICY'));
  mock.state.soapFault=true;
  await assert.rejects(client.soap!.call('urn:upnp-org:serviceId:WANIPConn1','GetExternalIPAddress'),code('ROUTER_REJECTED'));
});
