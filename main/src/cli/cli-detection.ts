/**
 * CLI Detection
 * Detects externally installed CLI binaries (THV-0020)
 */

import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { EXTERNAL_CLI_PATHS, getCliSourceFromPath } from './constants'
import type { ExternalCliInfo, Platform } from './types'
import log from '../logger'

const execFileAsync = promisify(execFile)

/** Extracts version from "ToolHive v0.7.2" line in `thv version` output */
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

export async function detectExternalCli(
  platform: Platform = process.platform as Platform
): Promise<ExternalCliInfo | null> {
  const pathsToCheck = EXTERNAL_CLI_PATHS[platform] ?? []
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
