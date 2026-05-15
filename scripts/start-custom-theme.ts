#!/usr/bin/env tsx
/**
 * Dev helper: launch the app with the test theme at
 * `branding-examples/test-theme.json` so we can verify that every themeable
 * surface in studio is actually wired to the branding override. The theme
 * uses a deliberately-distinct wine/coral/gold palette unmistakable from
 * studio's defaults. Cross-platform env-var setting (vs. inline `KEY=val` in
 * package.json, which breaks on Windows cmd.exe).
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const themePath = path.join(repoRoot, 'branding-examples', 'test-theme.json')

const child = spawn('pnpm', ['exec', 'electron-forge', 'start'], {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    BRANDING_CONFIG_PATH: themePath,
    FORCE_COLOR: process.env.FORCE_COLOR ?? '1',
  },
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig)
  })
}
