import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import * as readline from 'node:readline'

// Plain path file at project root. Empty => default (embedded)
const CONFIG_PATH = resolve(process.cwd(), '.thv_bin')

function readPath(): string {
  try {
    if (!existsSync(CONFIG_PATH)) return ''
    return readFileSync(CONFIG_PATH, 'utf-8').trim()
  } catch {
    return ''
  }
}

function writePath(p: string): void {
  writeFileSync(CONFIG_PATH, (p || '') + '\n')
}

function findGlobalThv(): string | null {
  try {
    const command = process.platform === 'win32' ? 'where thv' : 'which thv'
    const result = execSync(command, { encoding: 'utf-8' })
    if (!result) return null
    const firstLine = result.trim().split('\n')[0]
    return firstLine || null // Take first result if multiple
  } catch {
    return null
  }
}

function promptForPath(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question('Enter the full path to the thv binary: ', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function setDefault(): Promise<void> {
  writePath('')
  console.log('✅ THV binary set to: default (embedded binary)')
}

async function setCustom(customPath?: string): Promise<void> {
  let resolvedPath = customPath || findGlobalThv()
  if (!resolvedPath) {
    resolvedPath = await promptForPath()
  }
  if (!resolvedPath) {
    console.error('❌ No path provided')
    process.exit(1)
  }
  if (!existsSync(resolvedPath)) {
    console.error(`❌ Binary not found at: ${resolvedPath}`)
    process.exit(1)
  }
  writePath(resolvedPath)
  console.log(`✅ THV binary set to: ${resolvedPath}`)
}

async function showCurrentMode(): Promise<void> {
  const p = readPath()
  const mode = p ? 'custom' : 'default'
  console.log('\n📋 Current THV Binary Configuration:')
  console.log(`   Mode: ${mode}`)
  if (p) console.log(`   Path: ${p}`)
  console.log()
}

// CLI interface
if (require.main === module) {
  ;(async () => {
    const args = process.argv.slice(2)
    const command = args[0]

    if (!command || command === 'show') {
      await showCurrentMode()
      return
    }

    if (!['default', 'custom'].includes(command)) {
      console.error('❌ Invalid command. Usage:')
      console.error('   pnpm use-thv:default')
      console.error(
        '   pnpm use-thv:custom [path]  # no path => use PATH if available'
      )
      console.error('   pnpm use-thv:show')
      process.exit(1)
    }

    const customPath = args[1]
    if (command === 'default') await setDefault()
    else await setCustom(customPath)
  })().catch((err) => {
    console.error('❌ Error:', err.message)
    process.exit(1)
  })
}
