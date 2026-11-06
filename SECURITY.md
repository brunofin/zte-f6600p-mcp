# Security and responsible use

Use this project only with routers and networks you own or are authorized to administer. ISP ownership, service agreements and remote-management policies may still apply. Do not expose the router UI, UPnP service or an MCP transport to the public internet.

## Write access and the UI observation

On the researched firmware, a user-level account saw disabled editing controls, yet targeted DHCP and radio-mode POSTs succeeded with that same account. This is an observation of a **UI/server authorization inconsistency**, not a claim that all operations allow unrestricted access or that a router is vulnerable to unauthenticated writes. The account, firmware and endpoint matter. The client never guesses elevated credentials or modifies permission bits.

Do not test destructive operations just to establish permissions. Factory resets, WAN termination and firewall changes can interrupt service or expose devices. The repository defaults to read-only, requires explicit confirmation for mutations, and separately gates disruptive actions. Do not let an untrusted model or prompt supply approval on your behalf.

## Credentials, TLS and logging

- Supply your own base URL and credentials locally. `user/user` is documented only as an observed factory default.
- Keep `.env` files, sessions, backups, certificates, captures and router outputs out of version control.
- Prefer HTTPS with normal trust or your own independently verified certificate pin. Never set global TLS-verification bypasses.
- HTTP sends session cookies and challenges without transport confidentiality and is intended only for consciously selected trusted-lab use.
- Client errors do not include Got request objects, headers, bodies, URLs or server-supplied error text. MCP returns secret-redacted structured results and uses stdout only for JSON-RPC.
- Live device lists and requested network settings are still personal data. Redaction protects credential-like fields, **not all possible identifiers or arbitrary free text**. Keep your MCP host trusted; generic server responses may contain unexpected fields.
- Cookie jars stay in memory. No automatic request logging, persistence or credential fallback is enabled.

The firmware's legacy RSA PKCS#1 v1.5 / AES-CBC envelope is reproduced for compatibility. It is not recommended as a new protocol, and application-layer encryption does not replace TLS. Mutating requests are never automatically retried.

## Evidence and disclosure

For implementation defects, use GitHub's private vulnerability reporting if available; otherwise contact the maintainer through their public GitHub profile before posting exploit details or secrets. Do not open an issue containing router credentials, WAN addresses, SSIDs, client identifiers, serials, private certificate fingerprints or raw captures/configuration.

Firmware security findings should be reported responsibly to the manufacturer/ISP as appropriate. This repository does not claim a CVE, vendor acknowledgement or a completed coordinated-disclosure process.

The public catalog contains field names and observed protocol facts only. Local tests generate synthetic keys/certificates at runtime and do not contact a real router. A privacy-policy scanner and manual staged/history review are required before publication.
