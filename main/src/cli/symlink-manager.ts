/**
 * Symlink Manager
 * Creates and validates CLI symlinks (or copies on Windows) (THV-0020)
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
  copyFileSync,
  readFileSync,
} from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { app } from 'electron'
import { getDesktopCliPath } from './constants'
import { binPath } from '../toolhive-manager'
import type { SymlinkCheckResult, Platform } from './types'
import log from '../logger'

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

export function checkSymlink(
  platform: Platform = process.platform as Platform
): SymlinkCheckResult {
  const cliPath = getDesktopCliPath(platform)

  if (!existsSync(cliPath)) {
    return {
      exists: false,
      targetExists: false,
      target: null,
      isOurBinary: false,
    }
  }

  // On Windows, we use a copy, not a symlink
  if (platform === 'win32') {
    return {
      exists: true,
      targetExists: true,
      target: cliPath,
      isOurBinary: true,
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

    if (existsSync(cliPath)) {
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

  if (!existsSync(cliPath)) {
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
