import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPairSync } from 'node:crypto';
import { encodeFields, encryptField, decryptField, integrityCheck, sha256 } from '../src/client/crypto.js';
import { challenge, decodeLiteral, parseResponse, pageToken, publicKey, safeResponse } from '../src/client/protocol.js';
import { xml } from './mock-router.js';

test('firmware serializer exactly follows encodeURIComponent, not URLSearchParams plus encoding',()=>{
  assert.equal(encodeFields({alias:"A space & !'()*",empty:''}),"alias=A%20space%20%26%20!'()*&empty=");
});
test('AES envelope handles empty, unaligned and aligned values with zero padding',()=>{
  const token='synthetic-session-key';
  for(const text of ['', 'example', '1234567890123456','12345678901234567','Unicode café']) {
    const encrypted=encryptField(text,token,[...token].reverse().join(''));
    assert.equal(decryptField(encrypted,token),text);
    if(text==='1234567890123456')assert.equal(Buffer.from(encrypted,'base64').length,16);
  }
});
test('request integrity uses randomized RSA encryption of exact-body digest',()=>{
  const {publicKey:key}=generateKeyPairSync('rsa',{modulusLength:2048});
  const pem=key.export({type:'spki',format:'pem'}).toString();
  const a=integrityCheck('a=1',pem), b=integrityCheck('a=1',pem);
  assert.notEqual(a,b);assert.equal(Buffer.from(a,'base64').length,256);
  assert.equal(sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('XML parser preserves empty values, escaped strings and object boundaries',()=>{
  const response=parseResponse(xml({OBJ_EXAMPLE_ID:[{_InstID:'example',Empty:'',Name:'A & <B>'}]},['KeyPassphrase']));
  assert.equal(response.objects.OBJ_EXAMPLE_ID?.[0]?.Empty,'');
  assert.equal(response.objects.OBJ_EXAMPLE_ID?.[0]?.Name,'A & <B>');
  assert.deepEqual(response.encodedFields,['KeyPassphrase']);
});
test('response redaction includes encoded metadata and JSON structures',()=>{
  const response=parseResponse(JSON.stringify({master:{Password:'example',SerialNumber:'synthetic',Name:'example-device'}}));
  assert.deepEqual(safeResponse(response).data,{master:{Password:'[REDACTED]',SerialNumber:'[REDACTED]',Name:'example-device'}});
});
test('a user-supplied data value named SessionTimeout is not itself a session error',()=>{
  const response=parseResponse(xml({OBJ_EXAMPLE_ID:[{Name:'SessionTimeout'}]}));
  assert.equal(response.objects.OBJ_EXAMPLE_ID?.[0]?.Name,'SessionTimeout');
});
test('DTD/entities and malformed or unexpected HTML are rejected',()=>{
  for(const value of ['<!DOCTYPE test [<!ENTITY x SYSTEM "file:///example">]><test>&x;</test>','<html>not a router response</html>','<broken']) {
    assert.throws(()=>parseResponse(value));
  }
});
test('extract session/public key literals without eval and select final page token',()=>{
  assert.equal(decodeLiteral('a\\x42\\u0043\\n'),'aBC\n');
  assert.equal(pageToken('_sessionTmpToken="first"; _sessionTmpToken="s\\x65cond";'),'second');
  assert.equal(publicKey('var pubKey = "line1\\nline2";'),'line1\nline2');
  assert.equal(challenge('<ajax_response_xml_root>test-challenge</ajax_response_xml_root>'),'test-challenge');
});
