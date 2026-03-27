---
name: security-vuln-remediation
description: Remediate security vulnerabilities found by Grype or pnpm audit. Use when a security scan fails, a CVE needs fixing, or you need to analyze, upgrade, override, or ignore a vulnerable dependency.
---

# Security Vulnerability Remediation

Playbook for analyzing and remediating security vulnerabilities in this Electron/Node.js project. Applies to both CI (Cursor agent in GitHub Actions) and local development.

## Project Context

- **Package manager**: pnpm (lockfile: `pnpm-lock.yaml`)
- **Scanner**: Grype with config at `.grype.yaml` (only reports vulnerabilities with a fix available)
- **Audit**: `pnpm audit --prod --audit-level=moderate`
- **Existing overrides**: `pnpm.overrides` in `package.json` — used to pin transitive dependencies to patched versions
- **Production deps**: listed under `dependencies` in `package.json`
- **Dev-only deps**: listed under `devDependencies` in `package.json` — not shipped to users

## Remediation Workflow

Follow these steps in order. Stop at the first step that resolves the vulnerability.

### Step 1 — Identify Vulnerabilities

Run both scanners and capture the output:

```bash
grype . --config .grype.yaml
pnpm audit --prod --audit-level=moderate
```

For each finding, record:

- CVE ID (e.g. `CVE-2024-12345`)
- Affected package and installed version
- Fixed version (if available)
- Severity (critical / high / medium)
- Whether the package is a direct or transitive dependency

### Step 2 — Trace the Dependency

For each vulnerable package, understand who pulls it in:

```bash
pnpm why <package-name>
```

Record:

- Which direct dependency depends on it
- How many versions of the package are installed
- Whether it appears under `dependencies` (production) or `devDependencies` (dev-only)

### Step 3 — Attempt an Upgrade

Check if a patch/minor upgrade of the **direct** dependency resolves the CVE:

```bash
pnpm update <direct-dependency>
```

Or, if the vulnerable package is a direct dependency itself, update its version range in `package.json`.

After the change:

1. Run `pnpm install` to regenerate the lockfile
2. Re-run `grype . --config .grype.yaml` to verify the vulnerability is gone

If the upgrade resolves it, this step is complete. Move to the next vulnerability.

### Step 4 — Apply a pnpm Override

If no non-breaking upgrade is available, or the fix requires a major version bump of a transitive dependency that is safe to force:

Add or update an entry in `pnpm.overrides` inside `package.json`:

```json
{
  "pnpm": {
    "overrides": {
      "<vulnerable-package>": ">=<fixed-version>"
    }
  }
}
```

Use the `>=` prefix to allow future patches. Follow the existing pattern in the project (see current overrides for examples).

After the change:

1. Run `pnpm install` to regenerate the lockfile
2. Re-run `grype . --config .grype.yaml` to verify the vulnerability is gone

### Step 5 — Add a Grype Ignore (Last Resort)

Only if ALL of the following are true:

- The upgrade/override did not resolve the issue or would break functionality
- The vulnerable package is **not** a production dependency (only in `devDependencies` tree)
- The vulnerability's attack vector does not apply to a desktop Electron app

Add an ignore entry to `.grype.yaml`:

```yaml
ignore:
  - vulnerability: CVE-XXXX-XXXXX
    package:
      name: <package-name>
      type: npm
    reason: >-
      <package-name> is a dev-only dependency (used by <parent-package> for <purpose>).
      <CVE-ID> requires <attack-vector> which does not apply to this Electron desktop app.
      Fix requires a breaking major upgrade of <parent> that cannot be safely applied.
```

Every ignore MUST include a `reason` explaining why it is safe to suppress.

### Step 6 — Impact Analysis

For each vulnerability processed, write a summary containing:

| Field             | Description                                   |
| ----------------- | --------------------------------------------- |
| CVE ID            | The vulnerability identifier                  |
| Package           | Affected package name and version             |
| Severity          | Critical / High / Medium                      |
| CVSS Score        | Numeric score if available                    |
| Attack Vector     | Network / Local / Adjacent / Physical         |
| Production Impact | Yes (in `dependencies` tree) or No (dev-only) |
| Action Taken      | Upgraded / Overridden / Ignored               |
| Verification      | Whether grype/audit passes after the fix      |

## Output

When running in **plan mode** (Phase 1): write all findings and proposed actions to `remediation-plan.md` in the repository root. Do not modify project files.

When running in **implementation mode** (Phase 2): read `remediation-plan.md`, apply the changes to `package.json`, `pnpm-lock.yaml`, and `.grype.yaml` as needed, then verify with grype. Update `remediation-plan.md` with verification results. Also write a single-line conventional-commit-style title to `remediation-title.txt` summarizing the specific changes, for example:

- `fix(security): upgrade tar to 7.5.7, override lodash (CVE-2025-1234, CVE-2025-5678)`
- `fix(security): add grype ignore for tmp (dev-only, CVE-2025-9999)`
- `fix(security): override fast-xml-parser >=5.5.9 (CVE-2025-4321)`

Keep it under 72 characters. Mention the key packages and CVEs, not a generic description.

## Important Constraints

- Do NOT run `git` commands — git operations are handled by the CI workflow
- Do NOT run `gh` commands — PR creation is handled by the CI workflow
- Do NOT modify `.env` files
- Always run `pnpm install` after modifying `package.json` to regenerate the lockfile
- Always re-run `grype . --config .grype.yaml` after each remediation to verify
- Prefer the least invasive fix: upgrade > override > ignore
