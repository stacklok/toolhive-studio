# Security Vulnerability Remediation Plan

## Summary

Seven production vulnerabilities reported by `pnpm audit --prod --audit-level=moderate`, all transitive dependencies pulled in through `@modelcontextprotocol/sdk` and `@modelcontextprotocol/ext-apps` (plus `dompurify` via `streamdown`/`mermaid`). Direct MCP dependencies are already at latest (`@modelcontextprotocol/sdk@1.29.0`, `@modelcontextprotocol/ext-apps@1.7.4`); upgrading them does not resolve the findings.

## Findings

| CVE / GHSA | Package | Installed (before) | Fixed | Severity | CVSS | Attack Vector | Production | Direct parent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CVE-2026-13676 / GHSA-4c8g-83qw-93j6 | fast-uri | 3.1.2 | >=3.1.3 | High | 7.5 | Network | Yes | ajv (via MCP SDK, electron-store, @sentry/vite-plugin) |
| CVE-2026-16221 / GHSA-v2hh-gcrm-f6hx | fast-uri | 3.1.2 | >=3.1.4 | High | 7.5 | Network | Yes | ajv (same paths) |
| CVE-2026-59897 / GHSA-xgm2-5f3f-mvvc | hono | 4.12.25 | >=4.12.27 | Moderate | 4.8 | Network | Yes | @modelcontextprotocol/sdk |
| CVE-2026-59896 / GHSA-hvrm-45r6-mjfj | hono | 4.12.25 | >=4.12.27 | Moderate | 6.5 | Network | Yes | @modelcontextprotocol/sdk |
| CVE-2026-59895 / GHSA-w62v-xxxg-mg59 | hono | 4.12.25 | >=4.12.27 | Moderate | 6.1 | Network | Yes | @modelcontextprotocol/sdk |
| GHSA-frvp-7c67-39w9 | @hono/node-server | 1.19.14 | >=2.0.5 | Moderate | 7.4 | Network | Yes | @modelcontextprotocol/sdk |
| GHSA-c2j3-45gr-mqc4 | dompurify | 3.4.11 | >=3.4.12 | Low | — | Network | Yes | mermaid (via streamdown) |

## Dependency trace

- `fast-uri`: single major line (3.x only before fix). Pulled by `ajv@8.20.0`.
- `hono`: single major line (4.x only). Pulled by `@modelcontextprotocol/sdk@1.29.0`.
- `@hono/node-server`: single major line (1.x installed). Pulled by `@modelcontextprotocol/sdk@1.29.0`. Patched release is v2.0.5+ (major bump).
- `dompurify`: single major line (3.x only). Pulled by `mermaid@11.15.0`.

## Actions taken

| Package | Action | Override | Resolved version |
| --- | --- | --- | --- |
| fast-uri | Override | `fast-uri: '>=3.1.4'` | 4.1.1 |
| hono | Override | `hono: '>=4.12.27'` | 4.12.31 |
| @hono/node-server | Override (major) | `@hono/node-server: '>=2.0.5'` | 2.0.11 |
| dompurify | Override | `dompurify: '>=3.4.12'` | 3.4.12 |
| fast-xml-parser | Override (bump) | `fast-xml-parser: '>=5.10.1'` | 5.10.1 |
| sharp | Override | `sharp: '>=0.35.0'` | 0.35.3 |

### Notes

- `fast-xml-parser` override bumped from pinned `5.9.3` to `>=5.10.1` for GHSA-8r6m-32jq-jx6q (Grype CI).
- `sharp` override added for GHSA-f88m-g3jw-g9cj (dev dep via `icon-gen`, used by `generate-icons` script).

- `fast-uri` resolved to 4.1.1 (latest patched) rather than 3.1.4 because the `>=3.1.4` override allows newer majors. Audit clean; tests pass.
- `@hono/node-server` v2 override crosses MCP SDK's `^1.19.9` range. v2 breaking changes (Node 18 removal, Vercel adapter removal) do not affect this project (Node >=24, no Hono/Vercel imports). All 2557 tests pass.

## Verification

| Check | Result |
| --- | --- |
| `pnpm why fast-uri hono @hono/node-server dompurify` | Single patched version of each |
| `pnpm audit --prod --audit-level=moderate` | **Pass** — no vulnerabilities |
| `pnpm run type-check` | **Pass** |
| `pnpm run test:nonInteractive` | **Pass** — 2557 tests |
| `grype . --config .grype.yaml` | **Pass** (exit 0, DB updated) |
