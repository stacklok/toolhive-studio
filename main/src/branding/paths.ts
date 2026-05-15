import path from 'node:path'
import { app } from 'electron'

// SEP#725 — Resolve the branding config file path.
//
// Single override file. Env-var override matches cloud-ui's `BRANDING_CONFIG_PATH`
// for muscle memory. Default: `<userData>/branding-0.json` — per-OS-correct
// via Electron (`~/Library/Application Support/...` on macOS, `%APPDATA%/...`
// on Windows, `~/.config/...` on Linux).
//
// The `-0` suffix is future-proofing: layered `branding-N.json` precedence
// (highest N wins, per the Slack design in thread 1778080552.563009) is out
// of scope for MVP, but reserving the naming slot now lets a future loader
// add layering without renaming operator-deployed files.

const ENV_VAR = 'BRANDING_CONFIG_PATH'

export function getBrandingConfigPath(): string {
  return (
    process.env[ENV_VAR] ??
    path.join(app.getPath('userData'), 'branding-0.json')
  )
}
