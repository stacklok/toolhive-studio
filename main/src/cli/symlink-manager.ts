/**
 * Symlink Manager
 * Creates and validates CLI symlinks (or copies on Windows) (THV-0020)
 */

import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  copyFileSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { app } from 'electron'
import { getDesktopCliPath } from './constants'
import { readMarkerFile } from './marker-file'
import { binPath } from '../toolhive-manager'
import type { SymlinkCheckResult, Platform } from './types'
import log from '../logger'

const FLATPAK_APP_ID = 'com.stacklok.ToolHive'
const FLATPAK_CLI_PATH = '/app/toolhive/resources/bin/linux-x64/thv'

export function isFlatpak(): boolean {
  return existsSync('/.flatpak-info')
}

export const getBundledCliPath = (): string => binPath

export const isOurBinary = (target: string): boolean => {
  const bundledPath = getBundledCliPath()
  const normalizedTarget = path.normalize(target)
  const normalizedBundled = path.normalize(bundledPath)

  if (normalizedTarget === normalizedBundled) {
    return true
  }

  if (app.isPackaged) {
    return normalizedTarget.startsWith(path.normalize(process.resourcesPath))
  }

  const devBinDir = path.resolve(__dirname, '..', '..', 'bin')
  return normalizedTarget.startsWith(path.normalize(devBinDir))
}

/**
 * Check if a file or symlink exists at the given path, including dangling symlinks.
 * Unlike `existsSync`, this uses `lstatSync` which does NOT follow symlinks,
 * so it returns `true` even for broken/dangling symlinks.
 */
function fileOrSymlinkExists(filePath: string): boolean {
  try {
    lstatSync(filePath)
    return true
  } catch {
    return false
  }
}

export function checkSymlink(
  platform: Platform = process.platform as Platform
): SymlinkCheckResult {
  const cliPath = getDesktopCliPath(platform)

  if (!fileOrSymlinkExists(cliPath)) {
    return {
      exists: false,
      targetExists: false,
      target: null,
      isOurBinary: false,
    }
  }

  // In Flatpak, we use a wrapper script instead of a symlink
  if (isFlatpak()) {
    try {
      const content = readFileSync(cliPath, 'utf8')
      const isWrapper =
        content.includes('flatpak run') && content.includes(FLATPAK_APP_ID)
      return {
        exists: true,
        targetExists: true,
        target: cliPath,
        isOurBinary: isWrapper,
      }
    } catch {
      return {
        exists: true,
        targetExists: false,
        target: cliPath,
        isOurBinary: false,
      }
    }
  }

  // On Windows, we use a copy, not a symlink
  // Verify the binary checksum matches what we stored in the marker file
  if (platform === 'win32') {
    const marker = readMarkerFile()
    let isOurBinaryResult = false

    if (marker?.cli_checksum) {
      try {
        const content = readFileSync(cliPath)
        const currentChecksum = crypto
          .createHash('sha256')
          .update(content)
          .digest('hex')
        isOurBinaryResult = currentChecksum === marker.cli_checksum
        if (!isOurBinaryResult) {
          log.warn(
            `Windows CLI checksum mismatch: expected ${marker.cli_checksum}, got ${currentChecksum}`
          )
        }
      } catch (error) {
        log.warn(`Failed to verify Windows CLI checksum: ${error}`)
      }
    } else {
      // No checksum stored - cannot verify binary integrity
      // Require reinstall to establish checksum-based verification
      log.warn(
        'Windows CLI marker has no checksum stored - cannot verify binary integrity'
      )
      isOurBinaryResult = false
    }

    return {
      exists: true,
      targetExists: true,
      target: cliPath,
      isOurBinary: isOurBinaryResult,
    }
  }

  try {
    const stats = lstatSync(cliPath)

    if (!stats.isSymbolicLink()) {
      log.warn(`CLI path exists but is not a symlink: ${cliPath}`)
      return {
        exists: true,
        targetExists: true,
        target: cliPath,
        isOurBinary: false,
      }
    }

    const target = readlinkSync(cliPath)
    const resolvedTarget = path.resolve(path.dirname(cliPath), target)
    const targetExists = existsSync(resolvedTarget)

    return {
      exists: true,
      targetExists,
      target: resolvedTarget,
      isOurBinary: targetExists && isOurBinary(resolvedTarget),
    }
  } catch {
    return {
      exists: false,
      targetExists: false,
      target: null,
      isOurBinary: false,
    }
  }
}

export function createSymlink(
  platform: Platform = process.platform as Platform
): { success: boolean; error?: string; checksum?: string } {
  const cliPath = getDesktopCliPath(platform)
  const bundledPath = getBundledCliPath()
  const cliDir = path.dirname(cliPath)

  if (!existsSync(bundledPath)) {
    return { success: false, error: `Bundled CLI not found: ${bundledPath}` }
  }

  try {
    if (!existsSync(cliDir)) {
      mkdirSync(cliDir, { recursive: true })
      log.info(`Created CLI directory: ${cliDir}`)
    }

    if (fileOrSymlinkExists(cliPath)) {
      unlinkSync(cliPath)
      log.info(`Removed existing CLI at: ${cliPath}`)
    }

    if (platform === 'win32') {
      copyFileSync(bundledPath, cliPath)
      log.info(`Copied CLI to: ${cliPath}`)
      const content = readFileSync(cliPath)
      const checksum = crypto.createHash('sha256').update(content).digest('hex')
      return { success: true, checksum }
    }

    if (isFlatpak()) {
      const wrapper = [
        '#!/bin/sh',
        `exec flatpak run --command=${FLATPAK_CLI_PATH} ${FLATPAK_APP_ID} "$@"`,
        '',
      ].join('\n')
      writeFileSync(cliPath, wrapper, 'utf8')
      chmodSync(cliPath, 0o755)
      log.info(`Created flatpak wrapper script: ${cliPath}`)
      return { success: true }
    }

    symlinkSync(bundledPath, cliPath)
    log.info(`Created symlink: ${cliPath} -> ${bundledPath}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export function removeSymlink(
  platform: Platform = process.platform as Platform
): { success: boolean; error?: string } {
  const cliPath = getDesktopCliPath(platform)

  if (!fileOrSymlinkExists(cliPath)) {
    return { success: true }
  }

  try {
    unlinkSync(cliPath)
    log.info(`Removed CLI at: ${cliPath}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export function repairSymlink(
  platform: Platform = process.platform as Platform
): { success: boolean; error?: string; checksum?: string } {
  return createSymlink(platform)
}
