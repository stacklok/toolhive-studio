/**
 * CLI Detection
 * Detects externally installed CLI binaries (THV-0020)
 */

import { existsSync, readdirSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { homedir } from 'node:os'
import { EXTERNAL_CLI_PATHS, getCliSourceFromPath } from './constants'
import type { ExternalCliInfo, Platform } from './types'
import log from '../logger'

const execFileAsync = promisify(execFile)

/** Extracts version from "ToolHive v0.X.X" line in `thv version` output */
const parseVersionOutput = (stdout: string): string | null => {
  const match = stdout.match(/^ToolHive v(\d+\.\d+\.\d+(?:-[\w.]+)?)/m)
  return match?.[1] ?? null
}

const getCliVersion = async (cliPath: string): Promise<string | null> => {
  try {
    const { stdout } = await execFileAsync(cliPath, ['version'], {
      timeout: 5000,
    })
    return parseVersionOutput(stdout)
  } catch {
    return null
  }
}

function findWingetCliPaths(): string[] {
  const localAppData =
    process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local')
  const wingetPackagesDir = path.join(
    localAppData,
    'Microsoft',
    'WinGet',
    'Packages'
  )

  if (!existsSync(wingetPackagesDir)) {
    return []
  }

  try {
    const entries = readdirSync(wingetPackagesDir, { withFileTypes: true })
    const thvPaths: string[] = []

    for (const entry of entries) {
      // Match folders starting with 'stacklok.thv_' (case-insensitive)
      if (
        entry.isDirectory() &&
        entry.name.toLowerCase().startsWith('stacklok.thv_')
      ) {
        const cliPath = path.join(wingetPackagesDir, entry.name, 'thv.exe')
        if (existsSync(cliPath)) {
          thvPaths.push(cliPath)
        }
      }
    }

    return thvPaths
  } catch {
    return []
  }
}

export async function detectExternalCli(
  platform: Platform = process.platform as Platform
): Promise<ExternalCliInfo | null> {
  const pathsToCheck = [...(EXTERNAL_CLI_PATHS[platform] ?? [])]

  // On Windows, also scan the WinGet packages directory
  if (platform === 'win32') {
    pathsToCheck.push(...findWingetCliPaths())
  }

  const existingPath = pathsToCheck.find((p) => existsSync(p))

  if (!existingPath) {
    return null
  }

  log.info(`Found external CLI at: ${existingPath}`)

  const version = await getCliVersion(existingPath)

  return {
    path: existingPath,
    version,
    source: getCliSourceFromPath(existingPath, platform),
  }
}

export async function getCliInfo(cliPath: string): Promise<{
  exists: boolean
  version: string | null
  isExecutable: boolean
}> {
  const exists = existsSync(cliPath)

  if (!exists) {
    return { exists: false, version: null, isExecutable: false }
  }

  const version = await getCliVersion(cliPath)

  return {
    exists: true,
    version,
    isExecutable: version !== null,
  }
}
