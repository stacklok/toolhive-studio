import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import * as readline from 'node:readline'

// In dev, the bundler can change __dirname. Prefer project CWD for config,
// and fall back to resolving relative to this file for compatibility.
const CANDIDATE_CONFIG_PATHS = [
  resolve(process.cwd(), '.thv_bin'),
  resolve(__dirname, '..', '.thv_bin'),
]

function getConfigPath(): string {
  // Prefer the first existing candidate
  for (const p of CANDIDATE_CONFIG_PATHS) {
    if (existsSync(p)) return p
  }
  // Default to writing/reading in CWD
  return CANDIDATE_CONFIG_PATHS[0]
}
/**
 * Returns the resolved path to the .thv_bin config file location we use.
 * Exported for main-process watchers.
 */
export function getThvConfigPath(): string {
  return getConfigPath()
}

type ThvBinaryMode = 'default' | 'custom'

interface ThvBinaryConfig {
  mode: ThvBinaryMode
  customPath: string
}

function readConfig(): ThvBinaryConfig {
  const configPath = getConfigPath()
  if (!existsSync(configPath)) {
    return { mode: 'default', customPath: '' }
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    console.warn('⚠️  Failed to parse .thv_bin, using defaults')
    return { mode: 'default', customPath: '' }
  }
}

function writeConfig(config: ThvBinaryConfig): void {
  const configPath = getConfigPath()
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
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

async function setMode(
  mode: ThvBinaryMode,
  customPath?: string
): Promise<void> {
  const config = readConfig()

  switch (mode) {
    case 'default':
      config.mode = 'default'
      config.customPath = ''
      writeConfig(config)
      console.log('✅ THV binary mode set to: default (embedded binary)')
      break

    case 'custom': {
      // If a path is provided, use it; otherwise try to resolve from PATH, then prompt.
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
      config.mode = 'custom'
      config.customPath = resolvedPath
      writeConfig(config)
      console.log(`✅ THV binary mode set to: custom (${resolvedPath})`)
      break
    }
  }
}

async function showCurrentMode(): Promise<void> {
  const config = readConfig()
  console.log('\n📋 Current THV Binary Configuration:')
  console.log(`   Mode: ${config.mode}`)
  if (config.customPath) {
    console.log(`   Path: ${config.customPath}`)
  }
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
      console.error('   pnpm useThv:default')
      console.error(
        '   pnpm useThv:custom [path]  # no path => use PATH if available'
      )
      console.error('   pnpm useThv:show')
      process.exit(1)
    }

    const customPath = args[1]
    await setMode(command as ThvBinaryMode, customPath)
  })().catch((err) => {
    console.error('❌ Error:', err.message)
    process.exit(1)
  })
}

export {
  readConfig,
  writeConfig,
  getThvConfigPath,
  type ThvBinaryConfig,
  type ThvBinaryMode,
}
