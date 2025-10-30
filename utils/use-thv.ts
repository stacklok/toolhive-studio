import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import * as readline from 'node:readline'

const THV_BIN_CONFIG_PATH = resolve(__dirname, '..', '.thv_bin')

type ThvBinaryMode = 'default' | 'global' | 'custom'

interface ThvBinaryConfig {
  mode: ThvBinaryMode
  customPath: string
}

function readConfig(): ThvBinaryConfig {
  if (!existsSync(THV_BIN_CONFIG_PATH)) {
    return { mode: 'default', customPath: '' }
  }

  try {
    const content = readFileSync(THV_BIN_CONFIG_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.warn('⚠️  Failed to parse .thv_bin, using defaults')
    return { mode: 'default', customPath: '' }
  }
}

function writeConfig(config: ThvBinaryConfig): void {
  writeFileSync(THV_BIN_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
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

async function setMode(mode: ThvBinaryMode, customPath?: string): Promise<void> {
  const config = readConfig()

  switch (mode) {
    case 'default':
      config.mode = 'default'
      config.customPath = ''
      writeConfig(config)
      console.log('✅ THV binary mode set to: default (embedded binary)')
      break

    case 'global':
      const globalPath = findGlobalThv()
      if (!globalPath) {
        console.error(
          '❌ Could not find global thv binary. Make sure thv is installed and in your PATH.'
        )
        process.exit(1)
      }
      config.mode = 'global'
      config.customPath = globalPath
      writeConfig(config)
      console.log(`✅ THV binary mode set to: global (${globalPath})`)
      break

    case 'custom':
      const path = customPath || (await promptForPath())
      if (!path) {
        console.error('❌ No path provided')
        process.exit(1)
      }
      if (!existsSync(path)) {
        console.error(`❌ Binary not found at: ${path}`)
        process.exit(1)
      }
      config.mode = 'custom'
      config.customPath = path
      writeConfig(config)
      console.log(`✅ THV binary mode set to: custom (${path})`)
      break
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

    if (!['default', 'global', 'custom'].includes(command)) {
      console.error('❌ Invalid command. Usage:')
      console.error('   pnpm useThv:default')
      console.error('   pnpm useThv:global')
      console.error('   pnpm useThv:custom [path]')
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

export { readConfig, writeConfig, type ThvBinaryConfig, type ThvBinaryMode }
