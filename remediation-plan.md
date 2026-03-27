# Security Vulnerability Remediation Plan

Date: 2026-03-27
Implementation date: 2026-03-27

**Status: COMPLETE — all scanners pass.**

This document was prepared in plan mode. Implementation (Phase 2) has been applied — see the Verification Results section at the bottom.

## Scope and commands run

Commands executed:

- `grype . --config .grype.yaml`
- `grype . --config .grype.yaml -o json`
- `pnpm audit --prod --audit-level=moderate`
- `pnpm audit --prod --audit-level=moderate --json`
- `pnpm why brace-expansion`
- `pnpm why brace-expansion@1.1.12`
- `pnpm why brace-expansion@2.0.2`
- `pnpm why brace-expansion@5.0.4`
- `pnpm why @fastify/otel`
- `pnpm view @sentry/electron version`
- `pnpm view @sentry/vite-plugin version`
- `pnpm view brace-expansion version`
- `pnpm view minimatch@10.2.4 dependencies --json`
- `pnpm view minimatch@9.0.9 dependencies --json`
- `pnpm view minimatch@5.1.9 dependencies --json`
- `pnpm view minimatch@3.1.5 dependencies --json`

Files reviewed:

- `package.json`
- `.grype.yaml`
- `pnpm-lock.yaml`
- `main/src/sentry.ts`
- `renderer/src/lib/sentry.ts`

## Executive summary

- There is **one verified actionable vulnerability** in the current production dependency tree: `brace-expansion@5.0.4` with `GHSA-f886-m6hf-6m8v` / `CVE-2026-33750`.
- `pnpm audit --prod` reports exactly one vulnerability and traces it to `@sentry/electron -> @sentry/node -> @fastify/otel -> minimatch -> brace-expansion`.
- `grype` reports the same advisory against three installed versions of `brace-expansion`: `1.1.12`, `2.0.2`, and `5.0.4`.
- The `1.1.12` and `2.0.2` matches appear to be **scanner false positives / overmatches**. The npm/GitHub advisory range is `>=4.0.0 <5.0.5`, but Grype currently matches all versions `<5.0.5`.
- No direct dependency upgrade is currently available to fix the issue. The latest published versions for `@sentry/electron` and `@sentry/vite-plugin` are the same versions already in use.
- The safest remediation is a **targeted transitive override** for the `minimatch@10.x` branch to `brace-expansion@5.0.5`, followed by re-scanning.
- A blanket top-level `brace-expansion: >=5.0.5` override is **not safe**, because older `minimatch` majors in the dev toolchain depend on the `1.x` and `2.x` major lines.
- If Grype still reports only `brace-expansion@1.1.12` and `2.0.2` after the targeted fix, those remaining findings should be handled as **version-scoped Grype ignores** with a written justification.

## Scanner results

### `grype . --config .grype.yaml`

Reported:

- `brace-expansion@1.1.12` -> fixed in `5.0.5`
- `brace-expansion@2.0.2` -> fixed in `5.0.5`
- `brace-expansion@5.0.4` -> fixed in `5.0.5`

### `pnpm audit --prod --audit-level=moderate`

Reported:

- `brace-expansion`
- Vulnerable range: `>=4.0.0 <5.0.5`
- Patched range: `>=5.0.5`
- Production path: `.>@sentry/electron>@sentry/node>@fastify/otel>minimatch>brace-expansion`

## Findings table

| CVE / GHSA | Package | Severity | CVSS | Attack Vector | Production Impact | Action Planned | Verification expectation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `CVE-2026-33750` / `GHSA-f886-m6hf-6m8v` | `brace-expansion@5.0.4` | Moderate | 6.5 | Network (`AV:N`), low complexity, no privileges, user interaction required, availability impact only | Yes | Add a targeted transitive override so the `minimatch@10.x` path resolves to `brace-expansion@5.0.5` | `pnpm audit --prod` should pass; Grype should stop reporting `5.0.4` |
| `CVE-2026-33750` / `GHSA-f886-m6hf-6m8v` | `brace-expansion@2.0.2` | Medium in Grype output | 6.5 from advisory, but advisory vulnerable range does not include `2.0.2` | Same advisory vector, but version appears outside the affected range | No, dev-only | No package upgrade recommended for this version; ignore in Grype only if still reported after fixing `5.0.4` | `pnpm audit --prod` unaffected; Grype may still require a version-specific ignore |
| `CVE-2026-33750` / `GHSA-f886-m6hf-6m8v` | `brace-expansion@1.1.12` | Medium in Grype output | 6.5 from advisory, but advisory vulnerable range does not include `1.1.12` | Same advisory vector, but version appears outside the affected range | No, dev-only | No package upgrade recommended for this version; ignore in Grype only if still reported after fixing `5.0.4` | `pnpm audit --prod` unaffected; Grype may still require a version-specific ignore |

## Detailed analysis

### 1. Verified production vulnerability: `brace-expansion@5.0.4`

Advisory details from `pnpm audit --json`:

- GHSA: `GHSA-f886-m6hf-6m8v`
- CVE: `CVE-2026-33750`
- Title: `brace-expansion: Zero-step sequence causes process hang and memory exhaustion`
- Severity: `moderate`
- CVSS: `6.5`
- Vector: `CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:N/A:H`
- Patched version: `>=5.0.5`

Impact interpretation:

- The vulnerability is an availability issue, not a confidentiality or integrity issue.
- The exploit requires attacker-controlled input to reach `brace-expansion` with a zero-step sequence such as `{1..2..0}`.
- The advisory notes this typically matters when untrusted glob-like patterns are processed.
- In this repository, the affected version is present in the shipped application path through `@sentry/electron`, so this is not safe to dismiss as dev-only noise.

Why this is production-relevant:

- `package.json` declares `@sentry/electron` under `dependencies`.
- `main/src/sentry.ts` initializes `@sentry/electron/main`.
- `renderer/src/lib/sentry.ts` initializes `@sentry/electron/renderer`.
- `pnpm audit --prod` traces the vulnerable production path to:
  - `toolhive-studio -> @sentry/electron -> @sentry/node -> @fastify/otel -> minimatch@10.2.4 -> brace-expansion@5.0.4`

Additional reachability notes:

- `pnpm why brace-expansion@5.0.4` also shows a second declared-dependency path through `@sentry/vite-plugin`.
- That plugin is build-time in nature, but it is currently listed in `dependencies`, so it still appears in the production dependency graph.
- Even if `@sentry/vite-plugin` were later reclassified to `devDependencies`, the runtime `@sentry/electron` path would still leave the vulnerability actionable.

### 2. Grype-only overmatch: `brace-expansion@2.0.2`

Observed dependency paths:

- `toolhive-studio (devDependencies) -> @electron/rebuild -> node-gyp / @electron/node-gyp -> glob / minimatch`
- `toolhive-studio (devDependencies) -> @electron-forge/* -> @electron/packager -> @electron/universal -> minimatch`

Why this appears to be a false positive:

- `pnpm audit` does not report `2.0.2`.
- The advisory's vulnerable range is `>=4.0.0 <5.0.5`.
- `2.0.2` is outside that range.
- Grype JSON currently matches on `<5.0.5` without the lower bound, which likely explains the overmatch.

Risk assessment:

- Dev-only.
- Not part of the shipped Electron runtime path.
- Not a candidate for a global override to `5.0.5`, because the depending `minimatch` majors expect `brace-expansion@^2`.

### 3. Grype-only overmatch: `brace-expansion@1.1.12`

Observed dependency paths:

- `toolhive-studio (devDependencies) -> Electron Forge packaging toolchain`
- `toolhive-studio (devDependencies) -> eslint and related tooling`
- `toolhive-studio (devDependencies) -> older glob/minimatch consumers`

Why this appears to be a false positive:

- `pnpm audit` does not report `1.1.12`.
- The advisory's vulnerable range is `>=4.0.0 <5.0.5`.
- `1.1.12` is outside that range.
- As with `2.0.2`, Grype appears to be applying an over-broad `<5.0.5` matcher.

Risk assessment:

- Dev-only.
- Not part of the production runtime.
- Not a candidate for a global override to `5.0.5`, because the depending `minimatch@3` branch expects `brace-expansion@^1`.

## Dependency tracing summary

Installed `brace-expansion` versions and direct roots:

- `brace-expansion@5.0.4`
  - Production root: `@sentry/electron`
  - Declared dependency root: `@sentry/vite-plugin`
  - Dev roots: `typescript-eslint`, `rimraf`
- `brace-expansion@2.0.2`
  - Dev roots: `@electron/rebuild`, Electron Forge packaging chain
- `brace-expansion@1.1.12`
  - Dev roots: Electron Forge packaging chain, `eslint`, older `glob`

Count summary:

- Installed versions of `brace-expansion`: `3`
- Production-relevant version: `1` (`5.0.4`)
- Dev-only versions: `2` (`1.1.12`, `2.0.2`)

## Why a blanket override is unsafe

Published dependency ranges for `minimatch`:

- `minimatch@10.2.4` depends on `brace-expansion@^5.0.2`
- `minimatch@9.0.9` depends on `brace-expansion@^2.0.2`
- `minimatch@5.1.9` depends on `brace-expansion@^2.0.1`
- `minimatch@3.1.5` depends on `brace-expansion@^1.1.7`

Implication:

- Forcing all `brace-expansion` resolutions to `>=5.0.5` would violate the semver expectations of `minimatch@3`, `5`, and `9`.
- That could break Electron Forge packaging, rebuild tooling, or lint tooling.
- The correct fix must therefore be scoped to the `minimatch@10.x` consumer path only.

## Recommended remediation plan

### Primary fix

1. Add a **targeted** `pnpm.overrides` entry so only the `minimatch@10.x` branch resolves `brace-expansion` to `5.0.5` or newer.
2. Do **not** add a blanket top-level `brace-expansion: >=5.0.5` override.
3. Run `pnpm install`.
4. Re-run:
   - `pnpm audit --prod --audit-level=moderate`
   - `grype . --config .grype.yaml`

Why this is the recommended first move:

- It fixes the only verified production issue.
- It aligns with the actual dependency range required by `minimatch@10.2.4`.
- It is less invasive than attempting to reshuffle multiple older dev-tool branches.

### Expected result after the targeted override

- `pnpm audit --prod` should report zero vulnerabilities.
- Grype should stop reporting `brace-expansion@5.0.4`.
- Grype may still report `brace-expansion@1.1.12` and `2.0.2` because of the apparent matcher issue.

### If Grype still fails after the targeted override

If the only remaining Grype findings are the dev-only `1.1.12` and `2.0.2` versions, add **version-scoped ignore entries** in `.grype.yaml` with a reason that states:

- the authoritative npm/GitHub advisory range is `>=4.0.0 <5.0.5`
- the flagged version is outside that range
- the dependency is dev-only
- a blanket override to `5.0.5` would be unsafe because older `minimatch` majors depend on `1.x` or `2.x`

This is appropriate because:

- the versions are not in the advisory's affected range
- they are not used by the shipped runtime
- Grype appears to be overmatching them

### Options that are not recommended

- **Do not ignore the `5.0.4` finding**: it is in the production tree via `@sentry/electron`.
- **Do not add a global `brace-expansion` override**: it risks breaking older `minimatch` consumers.
- **Do not wait for a direct dependency upgrade as the only plan**: `@sentry/electron` and `@sentry/vite-plugin` are already at the latest published versions observed during this analysis.

## Suggested implementation order for Phase 2

1. Add the scoped `pnpm.overrides` entry for the `minimatch@10.x -> brace-expansion` path.
2. Run `pnpm install`.
3. Run `pnpm audit --prod --audit-level=moderate`.
4. Run `grype . --config .grype.yaml`.
5. If Grype still flags only `brace-expansion@1.1.12` and `2.0.2`, add narrow ignore entries for those versions only.
6. Re-run `grype . --config .grype.yaml`.

## Optional follow-up hardening

Separate from the vulnerability fix, consider moving `@sentry/vite-plugin` from `dependencies` to `devDependencies` in a later cleanup change. That would make the dependency classification more accurate, but it would not remove the verified runtime path through `@sentry/electron`.

---

## Verification Results (Phase 2 — Implementation)

### Changes applied

| File | Change |
| --- | --- |
| `package.json` | Added `"minimatch@^10>brace-expansion": ">=5.0.5"` to `pnpm.overrides` |
| `pnpm-lock.yaml` | Regenerated via `pnpm install --no-frozen-lockfile` |
| `.grype.yaml` | Added two version-scoped ignore entries for `brace-expansion@1.1.12` and `brace-expansion@2.0.2` |

### Post-fix scanner results

#### `pnpm audit --prod --audit-level=moderate`

```
No known vulnerabilities found
```

Exit code: `0` ✅

#### `grype . --config .grype.yaml`

```
No vulnerabilities found
```

Exit code: `0` ✅

### Updated findings table

| CVE / GHSA | Package | Severity | Production Impact | Action Taken | Verification |
| --- | --- | --- | --- | --- | --- |
| `CVE-2026-33750` / `GHSA-f886-m6hf-6m8v` | `brace-expansion@5.0.4` | Moderate (CVSS 6.5) | Yes | Added `"minimatch@^10>brace-expansion": ">=5.0.5"` override in `package.json`. Lockfile now resolves `brace-expansion@5.0.5` for the `minimatch@10.x` path. | `pnpm audit --prod` passes; `grype` no longer reports this finding. ✅ |
| `CVE-2026-33750` / `GHSA-f886-m6hf-6m8v` | `brace-expansion@2.0.2` | Medium (Grype overmatch) | No (dev-only) | Added version-scoped ignore entry in `.grype.yaml`. Version is outside the advisory's actual affected range (`>=4.0.0 <5.0.5`). A safe override is not possible without breaking `minimatch@9.x`/`5.x`. | `grype` no longer reports this finding after ignore entry. ✅ |
| `CVE-2026-33750` / `GHSA-f886-m6hf-6m8v` | `brace-expansion@1.1.12` | Medium (Grype overmatch) | No (dev-only) | Added version-scoped ignore entry in `.grype.yaml`. Version is outside the advisory's actual affected range (`>=4.0.0 <5.0.5`). A safe override is not possible without breaking `minimatch@3.x`. | `grype` no longer reports this finding after ignore entry. ✅ |
