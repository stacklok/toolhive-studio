#!/usr/bin/env -S npx tsx

import { spawn, type ChildProcess } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get all command line arguments (excluding node and script name)
const args: string[] = process.argv.slice(2)

console.log('I am ephemeral and I was launched with these parameters:')
console.log('Arguments:', args)

// Path to the actual thv binary (in the same directory)
const thvBinaryPath: string = join(__dirname, 'thv')

// Spawn the actual thv binary with all the arguments
const thvProcess: ChildProcess = spawn(thvBinaryPath, args, {
  stdio: 'inherit', // Pass through stdin, stdout, stderr
  detached: false,
})

// Handle process events
thvProcess.on('error', (error: Error) => {
  console.error('Failed to start thv binary:', error)
  process.exit(1)
})

thvProcess.on('exit', (code: number | null) => {
  process.exit(code ?? 0)
})

// Handle process termination signals
process.on('SIGINT', () => {
  thvProcess.kill('SIGINT')
})

process.on('SIGTERM', () => {
  thvProcess.kill('SIGTERM')
})
