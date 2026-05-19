#!/usr/bin/env tsx
/**
 * Dev helper: launch the app with `branding-examples/test-theme.json` to
 * verify every themeable surface is wired to the branding override. Uses a
 * tsx wrapper instead of inline `KEY=val` in package.json (which breaks on
 * Windows cmd.exe).
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

child.on('exit', (code) => {
  process.exit(code ?? 1)
})

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig)
  })
}
