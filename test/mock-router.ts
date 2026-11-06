import { createServer, type IncomingMessage } from 'node:http';
import { constants, createDecipheriv, createHash, generateKeyPairSync, privateDecrypt } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { encryptField, sha256 } from '../src/client/crypto.js';

const escape = (v: string) => v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function xml(objects: Record<string, Record<string, string>[]> = {}, encoded: string[] = []): string {
  return '<ajax_response_xml_root><IF_ERRORSTR>SUCC</IF_ERRORSTR><IF_ERRORID>0</IF_ERRORID><IF_ERRORTYPE>SUCC</IF_ERRORTYPE>' +
    Object.entries(objects).map(([name, items]) => `<${name}>` + items.map(item => '<Instance>' + Object.entries(item).map(([k,v]) => `<ParaName>${escape(k)}</ParaName><ParaValue>${escape(v)}</ParaValue>`).join('') + '</Instance>').join('') + `</${name}>`).join('') +
    encoded.map(name => `<encode>${name}</encode>`).join('') + '</ajax_response_xml_root>';
}
export async function mockRouter() {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicPem = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const requests: { method: string; type: string; tag: string; query: URLSearchParams; body: string; cookie: string; check?: string }[] = [];
  const state = {
    loginCount: 0, page: '', token: '', contextFailures: 0, badChecks: 0, writes: 0,
    expireNextRead: false, expireNextWrite: false, corruptRadioReadBack: false, changeSsidOnRadioWrite: false,
    failWrite: false, soapFault: false,
    dhcp: { _InstID: 'IGD', IPAddr: '198.51.100.1', SubMask: '255.255.255.0', SubnetMask: '255.255.255.0',
      MinAddress: '198.51.100.20', MaxAddress: '198.51.100.200', DNSServer1: '203.0.113.53', DNSServer2: '',
      LeaseTime: '3600', ServerEnable: '1', DnsServerSource: '0' } as Record<string,string>,
    option: { _InstID: 'DEV.V4DP.Sr.Pl1.Op1', OptEnable: '0', OptCode: '66', OptValue: '' },
    radios: [
      { _InstID: 'DEV.WIFI.RD1', Band: '2.4GHz', Standard: 'b,g', '11nMode': '0', BandWidth: '20MHz',
        GreenField: '0', BasicDataRates: '1,2,5.5,11', OpDataRates: '1,2,5.5,11,6,9,12,18,24,36,48,54',
        AutoChannelEnabled: '0', Channel: '1', PreambleType: '0', RadioStatus: '1' },
      { _InstID: 'DEV.WIFI.RD2', Band: '5GHz', Standard: 'a,n,ac,ax', '11nMode': '1', BandWidth: '80MHz',
        GreenField: '0', BasicDataRates: '6,12,24', OpDataRates: '6,9,12,18,24,36,48,54',
        AutoChannelEnabled: '0', Channel: '36', PreambleType: '0', RadioStatus: '1' },
    ] as Record<string,string>[],
    wifiSecret: 'example-wireless-passphrase',
  };
  let authenticated = false, contextSequence = 0;
  const readBody = async (request: IncomingMessage) => {
    let body = '';
    for await (const chunk of request) body += chunk.toString();
    return body;
  };
  const unpad = (ciphertext: string) => {
    // Test-only raw RSA decode: no test private key is ever committed. Avoid
    // deprecated PKCS1 privateDecrypt behavior in newer Node/OpenSSL builds.
    const block = privateDecrypt({ key: keys.privateKey, padding: constants.RSA_NO_PADDING }, Buffer.from(ciphertext, 'base64'));
    if (block[0] !== 0 || block[1] !== 2) throw new Error('Invalid PKCS1 envelope');
    const separator = block.indexOf(0, 2);
    if (separator < 10) throw new Error('Invalid PKCS1 padding');
    return block.subarray(separator+1).toString();
  };
  const decryptInput = (value: string, envelope: string) => {
    const [key,iv] = unpad(envelope).split('+');
    const cipher = createDecipheriv('aes-256-cbc', createHash('sha256').update(key!).digest(), createHash('sha256').update(iv!).digest().subarray(0,16));
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(Buffer.from(value,'base64')),cipher.final()]).toString().replace(/\0+$/,'');
  };
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url!, 'http://localhost');
      const body = await readBody(request);
      const type = url.searchParams.get('_type') ?? '', tag = url.searchParams.get('_tag') ?? '';
      requests.push({ method: request.method!, type, tag, query: url.searchParams, body,
        cookie: String(request.headers.cookie ?? ''), check: request.headers.check as string | undefined });
      response.setHeader('content-type', 'text/xml');
      if (url.pathname.startsWith('/upnp/control/')) {
        if (state.soapFault) { response.statusCode=500; response.end('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><s:Fault><faultcode>s:Client</faultcode><faultstring>synthetic fault</faultstring></s:Fault></s:Body></s:Envelope>'); return; }
        const action = String(request.headers.soapaction).split('#')[1]?.replaceAll('"','');
        const envelope = new XMLParser({ removeNSPrefix:true }).parse(body);
        if (!envelope.Envelope?.Body || !Object.hasOwn(envelope.Envelope.Body,action!)) { response.statusCode=400; response.end(); return; }
        response.end(`<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:${action}Response xmlns:u="urn:example"><NewExternalIPAddress>203.0.113.10</NewExternalIPAddress></u:${action}Response></s:Body></s:Envelope>`); return;
      }
      if (!tag) {
        response.setHeader('set-cookie', 'SID=synthetic-session; Path=/; HttpOnly');
        response.end(authenticated ? `<script>var pubKey = ${JSON.stringify(publicPem)};</script>` : '<html>Login</html>'); return;
      }
      if (type === 'loginData' && tag === 'login_entry' && request.method === 'GET') { response.end(JSON.stringify({ sess_token:'synthetic-login-token' })); return; }
      if (type === 'loginData' && tag === 'login_token') { response.end('<ajax_response_xml_root>synthetic-challenge</ajax_response_xml_root>'); return; }
      if (type === 'loginData' && tag === 'login_entry') {
        const params = new URLSearchParams(body);
        authenticated = params.get('Username') === 'example-user' && params.get('Password') === sha256('example-login-passwordsynthetic-challenge') && params.get('_sessionTOKEN') === 'synthetic-login-token';
        state.loginCount++;
        response.end(JSON.stringify({ login_need_refresh:authenticated })); return;
      }
      if (type === 'loginData' && tag === 'logout_entry') { authenticated=false; response.end('{}'); return; }
      if (!authenticated || !request.headers.cookie?.includes('SID=synthetic-session')) {
        response.end('<ajax_response_xml_root><IF_ERRORSTR>SessionTimeout</IF_ERRORSTR></ajax_response_xml_root>'); return;
      }
      if (type === 'menuView') {
        state.page=tag; state.token=`synthetic-page-token-${contextSequence++}`;
        response.end(`<input disabled><script>_sessionTmpToken = ${JSON.stringify(state.token)};</script>`); return;
      }
      const expected: Record<string,string> = {
        'Localnet_LanMgrIpv4_DHCPBasicCfg_lua.lua':'lanMgrIpv4',
        'wlan_wlanbasicadconf_lua.lua':'wlanBasic','wlan_wlansssidconf_lua.lua':'wlanBasic',
        'wlan_wlanstatus_lua.lua':'localNetStatus','wlan_client_stat_lua.lua':'localNetStatus',
        'devmgr_statusmgr_lua.lua':'statusMgr','wan_internetstatus_lua.lua':'ethWanStatus',
        'topo_lua.lua':'mmTopology','devauth_accountmgr_lua.lua':'accountMgr',
      };
      if (expected[tag] && state.page!==expected[tag]) {
        state.contextFailures++; response.end('<ajax_response_xml_root><IF_ERRORSTR>SessionTimeout</IF_ERRORSTR></ajax_response_xml_root>'); return;
      }
      if (request.method === 'GET' && state.expireNextRead) {
        state.expireNextRead=false; authenticated=false;
        response.end('<html><div>SessionTimeout</div></html>'); return;
      }
      if (request.method === 'POST') {
        state.writes++;
        const params=new URLSearchParams(body);
        if (params.get('_sessionTOKEN')!==state.token || !request.headers.check || unpad(String(request.headers.check))!==sha256(body)) {
          state.badChecks++; response.end('<ajax_response_xml_root><IF_ERRORSTR>Invalid request</IF_ERRORSTR><IF_ERRORID>1</IF_ERRORID></ajax_response_xml_root>'); return;
        }
        if (state.failWrite) { response.end('<ajax_response_xml_root><IF_ERRORSTR>example-secret-server-error</IF_ERRORSTR><IF_ERRORID>2</IF_ERRORID></ajax_response_xml_root>'); return; }
        if (tag==='Localnet_LanMgrIpv4_DHCPBasicCfg_lua.lua') for (const [key,value] of params) if (key in state.dhcp && key!=='_InstID') state.dhcp[key]=value;
        if (tag==='wlan_wlanbasicadconf_lua.lua') {
          const radio=state.radios.find(r=>r._InstID===params.get('_InstID'))!;
          for(const [key,value] of params) if(key in radio)radio[key]=value;
          if(state.corruptRadioReadBack)state.radios[1]!.Channel='40';
          if(state.changeSsidOnRadioWrite)state.wifiSecret='a-different-synthetic-key';
        }
        if(state.expireNextWrite) { state.expireNextWrite=false;authenticated=false;response.end('<ajax_response_xml_root><IF_ERRORSTR>SessionTimeout</IF_ERRORSTR></ajax_response_xml_root>');return; }
      }
      if(tag==='Localnet_LanMgrIpv4_DHCPBasicCfg_lua.lua') response.end(xml({OBJ_Br0AndDhcpsHosCfg_ID:[state.dhcp],OBJ_OPTTFTPSERV_ID:[state.option],OBJ_LANDNS_ID:[{_InstID:'IGD',Ipv4DnsOrigin:'1'}]}));
      else if(tag==='wlan_wlanbasicadconf_lua.lua') response.end(xml({OBJ_WLANSETTING_ID:state.radios,OBJ_CHANNEL_ID:[{_InstID:'channel-example',Channel:'1'}]}));
      else if(tag==='wlan_wlansssidconf_lua.lua') response.end(xml({OBJ_WLANAP_ID:[{_InstID:'DEV.WIFI.AP1',ESSID:'EXAMPLE-NETWORK',Enable:'1',WEPKeyIndex:'1'}],OBJ_WLANPSK_ID:[{_InstID:'DEV.WIFI.AP1.PSK1',KeyPassphrase:encryptField(state.wifiSecret,state.token,[...state.token].reverse().join(''))}],OBJ_WLANWEPKEY_ID:[{_InstID:'DEV.WIFI.AP1.WEP1',WEPKey:''}]},['KeyPassphrase','WEPKey']));
      else if(tag==='devauth_accountmgr_lua.lua') response.end(xml({OBJ_USERINFO_ID:[{_InstID:'IGD',Username:'example-user',Right:'2'}]},['Password','NewPassword']));
      else if(tag==='wan_internetstatus_lua.lua') {
        if(url.searchParams.get('TypeUplink')!=='2'||url.searchParams.get('pageType')!=='1'){response.end('<html>Wrong query</html>');return;}
        response.end(xml({OBJ_WAN_ID:[{_InstID:'example-wan',ConnStatus:'Connected'}]}));
      } else response.end(xml({OBJ_DEVINFO_ID:[{_InstID:'IGD',ModelName:'F6600P',SerialNumber:'SYNTHETIC-SERIAL'}]}));
    } catch { response.statusCode=500;response.end('Mock failed'); }
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  if(!address||typeof address==='string')throw new Error('Missing mock address');
  return { baseUrl:`http://127.0.0.1:${address.port}`, state, requests, unpad, decryptInput,
    close:async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));} };
}
