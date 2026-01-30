/**
 * PATH Configuration
 * Shell RC file PATH modification for CLI access (THV-0020)
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
} from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import {
  getShellRcFiles,
  SHELL_PATH_ENTRY,
  SHELL_PATH_MARKERS,
  FISH_PATH_ENTRY,
} from './constants'
import type { PathConfigStatus } from './types'
import log from '../logger'

const execAsync = promisify(exec)

const escapeRegex = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Escape single quotes for PowerShell single-quoted strings
const escapePowerShellSingleQuote = (str: string): string =>
  str.replace(/'/g, "''")

const generatePathBlock = (isFish: boolean = false): string => {
  const pathEntry = isFish ? FISH_PATH_ENTRY : SHELL_PATH_ENTRY
  return [SHELL_PATH_MARKERS.start, pathEntry, SHELL_PATH_MARKERS.end].join(
    '\n'
  )
}

const contentHasPathConfig = (content: string): boolean =>
  content.includes(SHELL_PATH_MARKERS.start)

const removePathBlockFromContent = (content: string): string => {
  const blockPattern = new RegExp(
    `\\n*${escapeRegex(SHELL_PATH_MARKERS.start)}[\\s\\S]*?${escapeRegex(SHELL_PATH_MARKERS.end)}\\n*`,
    'g'
  )
  return content.replace(blockPattern, '\n')
}

const detectDefaultShell = async (): Promise<'bash' | 'zsh' | 'fish'> => {
  const shellEnv = process.env.SHELL ?? ''
  const lower = shellEnv.toLowerCase()

  if (lower.includes('zsh')) return 'zsh'
  if (lower.includes('fish')) return 'fish'
  if (lower.includes('bash')) return 'bash'

  if (process.platform === 'darwin') {
    try {
      const { stdout } = await execAsync(
        `dscl . -read /Users/${process.env.USER} UserShell`
      )
      const dscLower = stdout.toLowerCase()
      if (dscLower.includes('zsh')) return 'zsh'
      if (dscLower.includes('fish')) return 'fish'
      if (dscLower.includes('bash')) return 'bash'
    } catch {
      // Ignore detection errors
    }
  }

  return 'bash'
}

const addPathToFile = (filePath: string, isFish: boolean = false): boolean => {
  const dir = path.dirname(filePath)

  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8')

      if (contentHasPathConfig(content)) {
        log.info(`PATH already configured in: ${filePath}`)
        return true
      }

      const pathBlock = generatePathBlock(isFish)
      appendFileSync(filePath, `\n\n${pathBlock}\n`, 'utf8')
    } else {
      const pathBlock = generatePathBlock(isFish)
      writeFileSync(filePath, `${pathBlock}\n`, 'utf8')
    }

    log.info(`Added PATH configuration to: ${filePath}`)
    return true
  } catch (error) {
    log.error(`Failed to add PATH to ${filePath}: ${error}`)
    return false
  }
}

const removePathFromFile = (filePath: string): boolean => {
  if (!existsSync(filePath)) {
    return true
  }

  try {
    const content = readFileSync(filePath, 'utf8')

    if (!contentHasPathConfig(content)) {
      return true
    }

    const newContent = removePathBlockFromContent(content)
    writeFileSync(filePath, newContent, 'utf8')
    log.info(`Removed PATH configuration from: ${filePath}`)
    return true
  } catch (error) {
    log.error(`Failed to remove PATH from ${filePath}: ${error}`)
    return false
  }
}

async function configureWindowsPath(): Promise<{
  success: boolean
  modifiedFiles: string[]
}> {
  const toolhiveBinPath = path.join(
    process.env.LOCALAPPDATA ?? path.join(homedir(), 'AppData', 'Local'),
    'ToolHive',
    'bin'
  )

  try {
    // Query actual user PATH from Windows
    const { stdout } = await execAsync(
      `powershell -Command "[Environment]::GetEnvironmentVariable('Path', 'User')"`
    )
    const userPath = stdout.trim()
    const isAlreadyConfigured = userPath
      .split(';')
      .some((p) => p.toLowerCase() === toolhiveBinPath.toLowerCase())

    if (isAlreadyConfigured) {
      log.info('Windows PATH already configured')
      return { success: true, modifiedFiles: ['Windows User PATH'] }
    }

    // Add to user PATH using PowerShell (escape single quotes for safety)
    const escapedPath = escapePowerShellSingleQuote(toolhiveBinPath)
    const command = `[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';${escapedPath}', 'User')`
    await execAsync(`powershell -Command "${command}"`)
    log.info(`Added ${toolhiveBinPath} to Windows user PATH`)
    return { success: true, modifiedFiles: ['Windows User PATH'] }
  } catch (error) {
    log.error(`Failed to configure Windows PATH: ${error}`)
    return { success: false, modifiedFiles: [] }
  }
}

export async function configureShellPath(): Promise<{
  success: boolean
  modifiedFiles: string[]
}> {
  if (process.platform === 'win32') {
    return configureWindowsPath()
  }

  const shellRcFiles = getShellRcFiles()
  const modifiedFiles: string[] = []

  const defaultShell = await detectDefaultShell()
  log.info(`Detected default shell: ${defaultShell}`)

  const defaultShellFiles = shellRcFiles[defaultShell] ?? []
  const isFish = defaultShell === 'fish'

  for (const rcFile of defaultShellFiles) {
    if (addPathToFile(rcFile, isFish)) {
      modifiedFiles.push(rcFile)
    }
  }

  const otherShells = Object.entries(shellRcFiles).filter(
    ([shell]) => shell !== defaultShell
  )

  for (const [shell, files] of otherShells) {
    const shellIsFish = shell === 'fish'

    for (const rcFile of files) {
      if (existsSync(rcFile) && addPathToFile(rcFile, shellIsFish)) {
        if (!modifiedFiles.includes(rcFile)) {
          modifiedFiles.push(rcFile)
        }
      }
    }
  }

  return { success: true, modifiedFiles }
}

async function removeWindowsPath(): Promise<{
  success: boolean
  modifiedFiles: string[]
}> {
  const toolhiveBinPath = path.join(
    process.env.LOCALAPPDATA ?? path.join(homedir(), 'AppData', 'Local'),
    'ToolHive',
    'bin'
  )

  try {
    // Remove from user PATH using PowerShell (escape single quotes for safety)
    const escapedPathLower = escapePowerShellSingleQuote(
      toolhiveBinPath.toLowerCase()
    )
    const command = `$currentPath = [Environment]::GetEnvironmentVariable('Path', 'User'); $newPath = ($currentPath -split ';' | Where-Object { $_.ToLower() -ne '${escapedPathLower}' }) -join ';'; [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')`
    await execAsync(`powershell -Command "${command}"`)
    log.info(`Removed ${toolhiveBinPath} from Windows user PATH`)
    return { success: true, modifiedFiles: ['Windows User PATH'] }
  } catch (error) {
    log.error(`Failed to remove from Windows PATH: ${error}`)
    return { success: false, modifiedFiles: [] }
  }
}

export async function removeShellPath(): Promise<{
  success: boolean
  modifiedFiles: string[]
}> {
  if (process.platform === 'win32') {
    return removeWindowsPath()
  }

  const shellRcFiles = getShellRcFiles()
  const modifiedFiles: string[] = []

  const allFiles = Object.values(shellRcFiles).flat()

  for (const rcFile of allFiles) {
    if (removePathFromFile(rcFile)) {
      modifiedFiles.push(rcFile)
    }
  }

  return { success: true, modifiedFiles }
}

export async function checkPathConfiguration(): Promise<PathConfigStatus> {
  if (process.platform === 'win32') {
    const toolhiveBinPath = path.join(
      process.env.LOCALAPPDATA ?? path.join(homedir(), 'AppData', 'Local'),
      'ToolHive',
      'bin'
    )

    try {
      // Query the actual user PATH from Windows, not process.env.PATH
      const { stdout } = await execAsync(
        `powershell -Command "[Environment]::GetEnvironmentVariable('Path', 'User')"`
      )
      const userPath = stdout.trim()
      const isConfigured = userPath
        .split(';')
        .some((p) => p.toLowerCase() === toolhiveBinPath.toLowerCase())

      return {
        isConfigured,
        modifiedFiles: isConfigured ? ['Windows User PATH'] : [],
        pathEntry: toolhiveBinPath,
      }
    } catch {
      // Fallback to process.env.PATH if PowerShell fails
      const pathEnv = process.env.PATH ?? ''
      const isConfigured = pathEnv
        .split(';')
        .some((p) => p.toLowerCase() === toolhiveBinPath.toLowerCase())

      return { isConfigured, modifiedFiles: [], pathEntry: toolhiveBinPath }
    }
  }

  const shellRcFiles = getShellRcFiles()
  const configuredFiles = Object.values(shellRcFiles)
    .flat()
    .filter((filePath) => {
      if (!existsSync(filePath)) return false
      try {
        const content = readFileSync(filePath, 'utf8')
        return contentHasPathConfig(content)
      } catch {
        return false
      }
    })

  return {
    isConfigured: configuredFiles.length > 0,
    modifiedFiles: configuredFiles,
    pathEntry: SHELL_PATH_ENTRY,
  }
}
