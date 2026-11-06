# Research boundaries and observations

## Tested family

- Manufacturer/model: ZTE F6600P.
- Firmware observed: V9.0.10P6N6; hardware revision V9.0.12.
- Web UI languages included Portuguese and English.
- HTTP and HTTPS management were available; the HTTPS certificate needed explicit trust.
- Factory credentials `user/user` authenticated a user-level session on the researched build.

This is one firmware/deployment, not a compatibility matrix for all ZTE devices. Manufacturer names, model/revision strings, field names and constant protocol paths are public technical facts; installation-specific identifiers and values are not part of the evidence published here.

## Service observations

TCP services identified during research included DNS (53), web management (80/443), UPnP IGD (52869), and an **unidentified service on 18991**. The unidentified service has no implemented client or inferred capabilities. Telnet (23) was filtered rather than demonstrated usable. Targeted UDP requests confirmed DNS and SSDP; lack of an SNMP response was inconclusive. This repository does not implement port scanning or claim a full UDP inventory.

## Endpoint evidence

The 58 HTTP handler references come from 29 authenticated leaf pages, login/shared JavaScript and service descriptions—not guessed route names. Each catalog operation records method, selector, effect, verification status and evidence. Static form controls, optional selections and runtime response fields are preserved as schemas/field names, not actual configuration values.

Two targeted data writes were observed succeeding with the supplied user-level account even though the UI disabled editing:

1. A DHCP start-address update. Fresh read-back showed only that boundary changed.
2. An existing 20 MHz 2.4 GHz radio changing from b/g to b/g/n, including its corresponding `11nMode` flag. Fresh read-back preserved other radio/SSID/security settings; independent over-the-air inspection confirmed HT support.

These are narrow behavioral checks. They do not prove arbitrary updates, new-rule creation/deletion, WAN reconfiguration, credential changes, reboot/reset or SOAP writes will work. Schema availability, UI visibility, authentication success and server-side write permission are different facts.

Successful passive reads were observed for 48 handlers. SOAP getters returned traffic counters, status, external-address and mapping information. Two advertised getters returned faults. Unknown `MagicOn` semantics were not exercised. See the generated catalog for exact evidence flags.

The TypeScript implementation has synthetic protocol and MCP tests plus a read-only hardware smoke check. The live hardware reads did not perform configuration mutations. Historical research write checks should not be confused with live mutation coverage of every TypeScript helper or option.

## What is intentionally absent

- No raw firmware page/JavaScript bundles, configuration exports or packet captures.
- No router/LAN/WAN addresses, client MACs/BSSIDs, SSIDs, hostnames, serials, personal certificate pins, session tokens or Wi-Fi/account secrets from the researched installation.
- No operational household inventory or private troubleshooting history.
- No claim of a diagnosed IoT connectivity cause, vendor-confirmed vulnerability, CVE assignment or coordinated-disclosure completion.

Examples use reserved domains/documentation networks. Automated checks help enforce this boundary, but contributors must still review content and commit history manually.
