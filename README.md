# ZTE F6600P: HTTP client, endpoint research and MCP

An independent, open-source blueprint for talking directly to a ZTE F6600P router—without browser automation or publishing a package to npm.

**One repository, two loosely coupled layers:**

- **`src/client/`**: a Got-based TypeScript HTTP client. Owns cookies, authentication, page contexts, request integrity, encryption, response parsing and write policy. It **does not import or initialize the MCP SDK**.
- **`src/mcp/`**: a thin stdio MCP server that consumes the client.
- **`src/data/endpoints.json`**: curated public protocol metadata shared by the implementation and generated documentation.

## What is documented

Research on **F6600P firmware V9.0.10P6N6 / hardware V9.0.12** identified:

| Finding | Count |
|---|---:|
| HTTP handlers | 58 |
| Page-context routes | 29 |
| HTTP method/action definitions | 128 |
| Handlers with observed successful reads | 48 |
| Handlers exposing configuration-write controls | 26 |
| UPnP SOAP actions across four services | 27 |

Sources were the served firmware UI, shared JavaScript, observed responses and UPnP service descriptions. This is **not an assertion that all firmware endpoints have been found**, or that all advertised operations work.

**Targeted writes verified during research:** updating a DHCP start address and switching a 20 MHz 2.4 GHz radio between legacy and mixed modes. Read-back showed the requested changes while preserving unrelated settings. Other writes are source-derived candidates unless explicitly marked otherwise. The b/g/n/ax option is source-derived; that specific transition has not been live-tested.

The UI disabled editing for a user-level account, but the tested endpoints accepted authenticated writes anyway. **UI-disabled is not a server-side permission check.** Do not infer that every router, firmware or endpoint behaves identically.

## API reference

- [Complete endpoint and action catalog](docs/endpoints.md)
- [OpenAPI 3.1 JSON](docs/openapi.json)
- [Authentication, encryption and wire protocol](docs/protocol.md)
- [Architecture and implementation boundaries](docs/architecture.md)
- [Research scope and service observations](docs/research.md)
- [Security and responsible use](SECURITY.md)

The router uses **HTTP RPC**, not conventional REST: most handlers share `/` and are selected by `_type` and `_tag`. The OpenAPI document describes that real dispatch path, with per-handler schemas in `components.schemas` and evidence in `x-router-handlers`. It does not invent REST paths that the firmware would reject.

For a local, read-only Swagger UI:

```sh
npm run docs:serve
# Open http://localhost:8787
```

The viewer loads Swagger UI assets from a CDN and disables “Try it out.” It never receives router credentials. The Markdown/JSON reference works offline. Per-handler details are most readable in `docs/endpoints.md`; Swagger's standard UI does not turn query-dispatched handlers into separate operations.

## Install and run

Requires **Node.js 22 or newer**. Everything runs from this checkout; **no npm publishing, workspace linking, global installation or separate client package is required**.

```sh
git clone https://github.com/brunofin/zte-f6600p-mcp.git
cd zte-f6600p-mcp
npm ci --ignore-scripts
npm run build
cp .env.example .env
# Edit .env locally. Never commit it.
node --env-file=.env dist/mcp/index.js
```

The server uses **stdio**, so running it directly waits for an MCP client to send JSON-RPC. It is not a web server.

### Configuration

| Variable | Required/default | Meaning |
|---|---|---|
| `ROUTER_BASE_URL` | Required | Your explicit router root URL; no discovery or hard-coded installation address |
| `ROUTER_USERNAME` | Required | Router account |
| `ROUTER_PASSWORD` | Required | Router password |
| `ROUTER_TLS_SHA256` | Optional | Independently verified SHA-256 leaf-certificate pin for a self-signed router |
| `ROUTER_UPNP_BASE_URL` | Optional, disabled | Explicit UPnP root URL on the same hostname; observed service port was 52869 |
| `ROUTER_ALLOW_WRITES` | `false` | Enable intentional mutations/actions |
| `ROUTER_ALLOW_DANGEROUS_ACTIONS` | `false` | Also permit disruptive operations such as restart, reset, WAN termination, scans or counter resets |

**Factory credentials observed on the researched firmware were `user` / `user`.** They are documented defaults, not a recommendation to retain them. The client does not silently choose credentials, attempt other accounts, or elevate privileges. ISP-customized routers can have different defaults and permissions.

Prefer HTTPS. Normal certificate verification is enabled unless you explicitly configure a certificate pin. In pinning mode, the HTTP socket is withheld until the certificate's digest matches: credentials are not sent to a mismatched certificate. There is no “accept every certificate” switch or HTTP downgrade fallback. Obtain and verify the pin through a trusted channel; blindly trusting a certificate fetched over an untrusted network defeats pinning.

### MCP client configuration

Use the executable and absolute checkout path in your MCP application's settings:

```json
{
  "mcpServers": {
    "zte-f6600p": {
      "command": "node",
      "args": ["/absolute/path/to/zte-f6600p-mcp/dist/mcp/index.js"],
      "env": {
        "ROUTER_BASE_URL": "https://router.example.invalid",
        "ROUTER_USERNAME": "user",
        "ROUTER_PASSWORD": "user",
        "ROUTER_ALLOW_WRITES": "false",
        "ROUTER_ALLOW_DANGEROUS_ACTIONS": "false"
      }
    }
  }
}
```

Replace the reserved example hostname and credentials locally. Use your application's secret management when available. For a self-signed router, also provide your own verified `ROUTER_TLS_SHA256`.

### MCP tools

| Tool | Purpose |
|---|---|
| `router_list_endpoints` | Inspect the local public catalog; no network request |
| `router_read` | Read a catalog-approved passive handler |
| `router_get_dhcp` | Read DHCP settings |
| `router_get_wifi` | Read radios, SSID status and associated clients; no active scan |
| `router_set_dhcp_range` | Preserve existing settings, patch boundaries, validate subnet, read back |
| `router_set_24ghz_mode` | Change an existing 20 MHz 2.4 GHz radio's mixed mode; verify radios and SSID/key preservation |
| `router_execute_action` | Expert wire-level action from the catalog, with explicit parameters—not an automatic generic patch |
| `router_soap_read` | Read an advertised SOAP action at an explicitly configured UPnP origin |
| `router_soap_action` | Explicit SOAP operation subject to write/disruption policy |

The `router://catalog` MCP resource exposes the sanitized catalog.

Every mutation requires writes enabled **and** `confirm: true` on the call. Confirmation is a policy signal, not a substitute for the MCP host obtaining real user approval. Disruptive operations additionally require the dangerous-action flag. **Enabling writes does not schedule or perform a write.**

Some GET handlers initiate radio scans. They are deliberately excluded from passive reads and require the explicit action path. Reboots/factory resets are never used for discovery or verification. `Cancel` means reload, **not undo**, and is not exposed as an executable action.

## Use only the HTTP client

After building, import the client directly; importing it does not start MCP or contact a router:

```js
import { RouterClient } from './dist/client/index.js';

const router = new RouterClient({
  baseUrl: process.env.ROUTER_BASE_URL,
  username: process.env.ROUTER_USERNAME,
  password: process.env.ROUTER_PASSWORD,
  certificateSha256: process.env.ROUTER_TLS_SHA256,
  allowWrites: false,
});
try {
  console.log(await router.getDhcp()); // Credential/secret fields are redacted.
} finally {
  await router.close();
}
```

The generic `read()`/`execute()` methods expose cataloged passive handlers and explicit wire actions. Authentication is handled internally; UI-language/mode/setup preferences are documented but not exposed as generic actions. Candidate fields are **not complete server schemas**: expert actions require correctly normalized wire fields and instance identities. Typed helpers exist only where preservation and verification logic are implemented. SOAP is optional and does not receive login cookies or credentials.

## Development and evidence

```sh
npm run check       # Typecheck, offline mock tests, generated-doc checks, privacy policy
npm run build
npm audit
npm run docs:generate
```

Tests use synthetic fixtures and local mock servers. They do not discover, log in to, or mutate a real router. TLS test certificates and RSA keys are generated at test time, not committed. Run the checks locally with `npm run check`; dependency installation and auditing require network access.

No raw firmware UI dumps, private configuration, packet captures, SSIDs, client identities, original IP/MAC addresses, device serials, personal certificate pins, session tokens or real secrets are included. Runtime MCP reads naturally return your local network's requested non-secret data to your MCP host—keep that host trusted and review its retention settings. “Secret redaction” is not full anonymization of live device lists.

Contributions should include sanitized evidence, exact model/firmware, a narrowly described operation and verification status. Do not attach raw configurations, screenshots containing credentials, or captures. See [SECURITY.md](SECURITY.md).

## License and credits

MIT. Independent research; not affiliated with, approved by, or supported by ZTE or any ISP. ZTE and product names belong to their respective owners. This repository contains original implementation and curated protocol facts, not redistributed firmware UI bundles.

<!-- funding:start -->
## Support

If this project is useful to you, please consider supporting my open-source work.

[![GitHub Sponsors](https://img.shields.io/badge/GitHub_Sponsors-Sponsor-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/brunofin)

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-FF5E5B?style=for-the-badge&logo=kofi&logoColor=white)](https://ko-fi.com/brunofin)

[![Wise](https://img.shields.io/badge/Wise-Donate-9FE870?style=for-the-badge&logo=wise&logoColor=163300)](https://wise.com/pay/me/brunof24)

[![Pix](https://img.shields.io/badge/Pix-Donate-32BCAD?style=for-the-badge&logo=pix&logoColor=white)](https://nubank.com.br/cobrar/3164y/6ae4922e-9b97-4445-ba66-3cbcd0bd74a3)
<!-- funding:end -->
