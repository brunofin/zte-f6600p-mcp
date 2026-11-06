# Architecture and scope

```text
MCP host --stdio--> src/mcp/server.ts
                         |
                         v
                  RouterApi interface
                         |
                         v
                 src/client/RouterClient --Got--> configured router
                         |
                         +-- optional SoapClient --> configured UPnP origin

src/data/endpoints.json --> client allowlist
                       --> MCP catalog resource
                       --> generated endpoint Markdown and OpenAPI
```

## Separation

The HTTP client exports from `dist/client/index.js` and never imports `src/mcp` or the MCP SDK. It can be used by a script or another application without starting a server. The MCP layer accepts a small structural `RouterApi`, making it testable with mocks. SDK dependencies live in the same private checkout package to avoid npm publishing/linking overhead; there is no separate package release process.

The core client owns network safety because callers outside MCP need the same guarantees: explicit base URL, cookie isolation, page serialization, allowlisted operations, encryption, disabled retries, strict errors, write opt-in and read-back for typed helpers. MCP adds validated schemas, tool descriptions, annotations, confirmation fields and secret-safe error presentation. MCP annotations are descriptive—not an authorization boundary.

The catalog is curated protocol metadata, not a snapshot of a home network. Generated documentation is checked for drift in CI. Public source code does not fetch private research files to regenerate docs. The original served UI bundles and captures are intentionally not distributed.

## Capability levels

1. **Passive reads:** documented GET handlers; secrets redacted. Some reads remain source-derived, not live-verified.
2. **Typed updates:** DHCP boundaries and existing 20 MHz 2.4 GHz mixed mode. Read current values, preserve unrelated settings, normalize known fields, apply once, verify by fresh GET. Broader field combinations are not implied by the targeted research tests.
3. **Expert actions:** known wire action names with caller-supplied fields. Candidate schemas and evidence assist the caller but do not eliminate endpoint-specific preprocessing. Generic configuration writes return a fresh read-back; the caller must interpret preservation/semantic correctness.
4. **Operational/disruptive actions:** separately gated; no safe generic post-state check. Includes active GET scans. No destructive operation is used to discover capabilities.
5. **SOAP:** explicit separate origin, no forwarded credentials/cookies, SCPD argument allowlist. Read support and advertised support are tracked separately.

## Non-goals and limitations

- No permission escalation, credential guessing, arbitrary URLs, firmware upload or remote shell.
- No assumption that all ZTE models or ISP firmware builds use this protocol.
- No guarantee of an exhaustive firmware map: unlinked/admin-only handlers may exist.
- No automatic safe patcher for all 26 configuration handlers; several serializers remain firmware-specific.
- No automatic multi-controller coordination with browsers or ISP sessions.
- No secret recovery tool, packet capture, Wi-Fi troubleshooting daemon or periodic network scan.
- No confirmation that radio-mode changes repair smart-home devices. Authentication by one modern client does not prove compatibility with every IoT chipset or cached credential state.

Read-only is the default. To test new operations, use equipment you control, keep a rollback plan, collect only the necessary evidence, and update verification status narrowly.
