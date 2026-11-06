import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:https';
import { X509Certificate } from 'node:crypto';
import got from 'got';
import { pinnedAgent } from '../src/client/tls.js';
import { sha256 } from '../src/client/crypto.js';
import { RouterClient, RouterError } from '../src/client/index.js';

test('TLS pin is checked before any HTTP data or credentials reach a mismatched certificate',async t=>{
  const directory=await mkdtemp(path.join(tmpdir(),'zte-synthetic-tls-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const keyPath=path.join(directory,'ephemeral.key'), certPath=path.join(directory,'ephemeral.pem');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',keyPath,'-out',certPath,'-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
  const cert=await readFile(certPath), key=await readFile(keyPath);
  let hits=0;
  const server=createServer({cert,key},(_request,response)=>{hits++;response.end('synthetic-ok');});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const baseUrl=`https://127.0.0.1:${address.port}`;
  const goodPin=sha256(new X509Certificate(cert).raw);
  const agent=pinnedAgent(goodPin,2000);t.after(()=>agent.destroy());
  const result=await got(baseUrl,{agent:{https:agent},retry:{limit:0}}).text();
  assert.equal(result,'synthetic-ok');assert.equal(hits,1);
  const client=new RouterClient({baseUrl,username:'example-user',password:'example-secret',certificateSha256:'0'.repeat(64),timeoutMs:2000});
  t.after(()=>client.close());
  await assert.rejects(client.getDhcp(),error=>error instanceof RouterError&&error.code==='TRANSPORT'&&!String(error).includes('example-secret'));
  assert.equal(hits,1,'mismatched pin must not send even the initial HTTP request');
  await assert.rejects(got(baseUrl,{retry:{limit:0}}));
  assert.equal(hits,1,'default trust must reject the synthetic self-signed certificate');
});
test('malformed pins are rejected as configuration errors',()=>{
  assert.throws(()=>pinnedAgent('not-a-pin',1000),error=>error instanceof RouterError&&error.code==='CONFIGURATION');
});
