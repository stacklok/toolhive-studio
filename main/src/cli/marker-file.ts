/**
 * Marker File Management
 * Manages ~/.toolhive/.cli-source marker file (THV-0020)
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  chmodSync,
} from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { getMarkerFilePath } from './constants'
import { isFlatpak } from './symlink-manager'
import type { CliSourceMarker, Platform } from './types'
import log from '../logger'

const CURRENT_SCHEMA_VERSION = 1 as const

export function readMarkerFile(): CliSourceMarker | null {
  const markerPath = getMarkerFilePath()

  if (!existsSync(markerPath)) {
    return null
  }

  try {
    const content = readFileSync(markerPath, 'utf8')
    const data = JSON.parse(content)

    if (data.schema_version !== CURRENT_SCHEMA_VERSION) {
      log.warn(`Marker file has invalid schema version: ${data.schema_version}`)
      return null
    }

    if (data.source !== 'desktop') {
      log.warn(`Marker file has invalid source: ${data.source}`)
      return null
    }

    return data as CliSourceMarker
  } catch (error) {
    log.warn(`Failed to read marker file: ${error}`)
    return null
  }
}

export function writeMarkerFile(
  marker: Omit<CliSourceMarker, 'schema_version'>
): boolean {
  const markerPath = getMarkerFilePath()
  const markerDir = path.dirname(markerPath)

  try {
    if (!existsSync(markerDir)) {
      mkdirSync(markerDir, { recursive: true })
    }

    const fullMarker: CliSourceMarker = {
      schema_version: CURRENT_SCHEMA_VERSION,
      ...marker,
    }

    writeFileSync(markerPath, JSON.stringify(fullMarker, null, 2), 'utf8')

    if (process.platform !== 'win32') {
      try {
        chmodSync(markerPath, 0o600)
      } catch {
        // Ignore chmod errors
      }
    }

    log.info(`Marker file written successfully: ${markerPath}`)
    return true
  } catch (error) {
    log.error(`Failed to write marker file: ${error}`)
    return false
  }
}

export function deleteMarkerFile(): boolean {
  const markerPath = getMarkerFilePath()

  if (!existsSync(markerPath)) {
    return true
  }

  try {
    unlinkSync(markerPath)
    log.info('Marker file deleted successfully')
    return true
  } catch (error) {
    log.error(`Failed to delete marker file: ${error}`)
    return false
  }
}

export function createMarkerForDesktopInstall(
  cliVersion: string,
  symlinkTarget: string | undefined,
  cliChecksum: string | undefined,
  platform: Platform = process.platform as Platform
): boolean {
  return writeMarkerFile({
    source: 'desktop',
    install_method:
      platform === 'win32' ? 'copy' : isFlatpak() ? 'wrapper' : 'symlink',
    cli_version: cliVersion,
    symlink_target: symlinkTarget,
    cli_checksum: cliChecksum,
    installed_at: new Date().toISOString(),
    desktop_version: app.getVersion(),
  })
}
