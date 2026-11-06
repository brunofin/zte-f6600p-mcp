# Firmware wire protocol

## Authentication and session context

1. GET the configured root URL to acquire cookies.
2. GET `/?_type=loginData&_tag=login_entry` for JSON `sess_token`.
3. GET `/?_type=loginData&_tag=login_token` for the XML-text challenge.
4. POST `login_entry` as form data: `action=login`, `Username`, `Password=hex(SHA256(password + challenge))`, `_sessionTOKEN=sess_token`.
5. Require `login_need_refresh`, GET the authenticated root, and extract the `asyEncode` RSA public key.
6. GET `/?_type=menuView&_tag=PAGE` before addressing a handler on that page. Extract its **fresh** `_sessionTmpToken`. Never evaluate the router's JavaScript to extract these literals.
7. Send the documented handler request and validate its response.
8. POST `logout_entry` with `IF_LogOff=1` on close. Cookies live only in memory.

The observed factory account was `user/user`. No credential guessing or alternate-account attempts are implemented.

The firmware tracks selected page context server-side. Calling a handler from the wrong context can yield an HTTP-200 XML `SessionTimeout` or a misleading HTML error. Use a single serialized session per client; do not interleave independent page operations through shared cookies. Separate client processes, the browser UI, or an ISP session may still invalidate each other's router sessions. The client never automatically retries a write; on an explicit later call it can establish a new session if expiration was detected.

## Query dispatch, not synthetic REST

All observed web handlers dispatch on the root path with `_type` and `_tag`. For example:

```text
GET /?_type=menuView&_tag=lanMgrIpv4
GET /?_type=menuData&_tag=Localnet_LanMgrIpv4_DHCPBasicCfg_lua.lua
POST /?_type=menuData&_tag=Localnet_LanMgrIpv4_DHCPBasicCfg_lua.lua
```

The WAN-status handler also requires `TypeUplink=2&pageType=1`. Device lookup uses the firmware's misspelling `DeveiceType=ETH|WLAN|ALL`. Topology aliases use query `Action=SET_ALIAS` plus custom body fields, **not** a generic `IF_ACTION` selector. See the catalog for every binding.

## Signed form body

Most data POSTs use:

```text
IF_ACTION=Apply&...normalized fields...&_sessionTOKEN=<fresh page token>
Check: base64(RSAES-PKCS1-v1_5(publicKey, utf8(hex(SHA256(exactBody)))))
```

Hash the **exact transmitted bytes**. The UI uses `encodeURIComponent` for values; `%20`, field ordering, commas, reserved characters and empty values matter. Do not hash JSON, re-encode after hashing, use a signature API, or use RSA-OAEP: this firmware encrypts a hex digest with RSA PKCS#1 v1.5. The public key is learned from the current authenticated page, not embedded in this repository. This is a reproduction of a legacy firmware protocol, not a recommended new cryptographic design.

Special state-changing handlers may use query selectors or custom bodies. Login/logout and UI preferences do not use the generic action body. They are documented but not all exposed as generic MCP actions.

## Encrypted parameters

Read responses contain `encode` elements naming fields such as `Password`, `NewPassword`, `PassWord`, `WEPKey` or `KeyPassphrase`. They dynamically mark matching UI controls, **even when the password value itself is omitted**.

For marked POST fields, the served UI:

1. Generates two 16-digit strings, key and IV material.
2. Derives AES-256 key = SHA-256(key material).
3. Uses the first 16 bytes of SHA-256(IV material) as the CBC IV, matching CryptoJS's block treatment.
4. Encrypts UTF-8 field content with AES-CBC and zero padding, base64 encoded. Empty strings stay empty; aligned inputs do not get an extra block.
5. RSA-wraps the UTF-8 `keyMaterial+"+"+ivMaterial` with the same public key and puts its base64 ciphertext in form field `encode`.
6. Appends the page token and constructs `Check` over the final complete form body.

For encrypted GET values, key material is the current page token and IV material is the reversed token. The client never returns plaintext passwords through MCP. It decodes only internally when verifying that a radio-mode write did not change SSID keys. Do not confuse response `encode` metadata with the POST `encode` key envelope.

The SDK rejects secret-looking input fields whose encryption requirements are not known. Not every UI field sharing an encrypted prefix is encrypted: selectors such as `WEPKeyIndex` are not password inputs. Runtime metadata and control types both matter.

## Normalization and instance identities

- Radio options map to multiple wire fields: b/g/n sets `Standard=b,g,n`, `11nMode=1`, `GreenField=0` and compatible rate lists. Do not change only the display dropdown name.
- UI IDs after the first `:` are instance/template suffixes, not part of wire parameter names.
- Checked radio controls submit their group name; checkboxes submit `0`/`1`.
- Split IP/MAC controls combine into one hidden field; UI-only `PostIgnore` controls do not post.
- Page hooks can normalize protocol numbers, masks, DNS sources, WAN selectors, timezones, Samba settings, DLNA paths and WPS fields. Source-derived candidate schemas are not complete serializers.
- Multi-object forms can share `_InstID`. DHCP basic configuration uses an option-object identity alongside bridge/DHCP settings. Do not flatten an arbitrary multi-object read into a write.
- List controls expose new `_InstID=-1` candidates and `Delete` operations for reservations, filters and forwards. These server behaviors remain untested in this blueprint.
- `Cancel` reloads fields; it is **not rollback**.

## Responses and verification

XML typically contains `ajax_response_xml_root`, `IF_ERRORSTR`, `IF_ERRORID`, `IF_ERRORTYPE` and `OBJ_*` nodes with `Instance`/`ParaName`/`ParaValue` pairs. Empty objects and encoded fields must be handled. Topology uses JSON. Some HTTP-200 responses are errors. The client rejects unexpected formats, DTD/entities and non-success application status; firmware-specific nonzero success-like codes need explicit support, not silent acceptance.

Typed patches perform read/merge/write followed by a fresh read. DHCP range changes are checked against the existing subnet, gateway and network/broadcast addresses. Radio-mode updates check all returned radio fields, unchanged SSID settings and in-memory key equality across renewed page tokens. They do **not** independently prove over-the-air broadcast behavior or IoT connectivity; those need separate tests.

An uncertain write or failed verification is reported as potentially applied. There are no automatic write retries, “Cancel” rollbacks, or factory resets. Repeating a failed request can duplicate a rule or overwrite newer settings.

## Operational actions

Active Wi-Fi scans use GET `wlan_sta_wlan_profile_lua.lua` with query `APGetFrom=ScanAP` or `ScanAP5g` and the session token. This illustrates why **HTTP method alone does not establish safety**. WAN release/disconnect, counter clears, WPS PIN regeneration, USB eject, reboot and factory reset have separate effect classifications and require extra opt-in.

## UPnP SOAP

The discovered IGD endpoint advertised a root description at `/gatedesc.xml` on port **52869**. Runtime SOAP support is opt-in through a separately configured URL on the same hostname. It performs no SSDP scan and sends no router login cookies or credentials to that origin.

Calls use the SCPD-defined control URL, SOAP envelope, input argument names and quoted `SOAPAction: "serviceType#ActionName"`. XML values are escaped, not interpolated. Read actions can require input arguments (e.g. mapping index); they remain reads. SOAP faults can use HTTP 500. `GetCommonLinkProperties` and `GetFirewallStatus` were advertised but faulted during research. Unknown `MagicOn` behavior is cataloged but deliberately not executable.

SOAP mutation responses have no generic state-verification guarantee. Opening ports or IPv6 pinholes changes network exposure; obtain approval even if no credentials are required by the router.
