#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const tsc = join(
  dirname(fileURLToPath(import.meta.url)),
  '../node_modules/@typescript/native/bin/tsc'
)
const result = spawnSync(process.execPath, [tsc, ...process.argv.slice(2)], {
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
