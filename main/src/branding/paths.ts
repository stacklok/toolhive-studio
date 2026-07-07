import path from 'node:path'
import { app } from 'electron'

// Resolve the branding config file path. The `-0` suffix reserves the
// naming slot for a potential future layered `branding-N.json` precedence
// (out of scope here) without renaming operator-deployed files.

const ENV_VAR = 'BRANDING_CONFIG_PATH'

export function getBrandingConfigPath(): string {
  return (
    process.env[ENV_VAR] ??
    path.join(app.getPath('userData'), 'branding-0.json')
  )
}
