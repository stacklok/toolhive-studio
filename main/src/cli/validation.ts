/**
 * CLI Alignment Validation
 * Every-launch validation logic for CLI alignment (THV-0020)
 */

import { app } from 'electron'
import { detectExternalCli, getCliInfo } from './cli-detection'
import { readMarkerFile, createMarkerForDesktopInstall } from './marker-file'
import {
  checkSymlink,
  createSymlink,
  getBundledCliPath,
  repairSymlink,
} from './symlink-manager'
import { configureShellPath, checkPathConfiguration } from './path-configurator'
import { getDesktopCliPath } from './constants'
import type { ValidationResult, CliAlignmentStatus, Platform } from './types'
import log from '../logger'

export async function validateCliAlignment(
  platform: Platform = process.platform as Platform
): Promise<ValidationResult> {
  log.info('Starting CLI alignment validation...')

  const external = await detectExternalCli(platform)
  if (external) {
    log.warn(`External CLI found at: ${external.path}`)
    return { status: 'external-cli-found', cli: external }
  }

  const marker = readMarkerFile()

  if (!marker) {
    log.info('No marker file found, treating as fresh install')
    return { status: 'fresh-install' }
  }

  const symlink = checkSymlink(platform)

  if (!symlink.exists) {
    log.warn('CLI alignment issue: symlink-missing')
    return { status: 'symlink-missing' }
  }

  if (!symlink.targetExists) {
    log.warn('CLI alignment issue: symlink-broken')
    return { status: 'symlink-broken', target: symlink.target ?? 'unknown' }
  }

  if (!symlink.isOurBinary) {
    log.warn('CLI alignment issue: symlink-tampered')
    return { status: 'symlink-tampered', target: symlink.target ?? 'unknown' }
  }

  // Check and configure PATH if needed
  const pathStatus = await checkPathConfiguration()
  if (!pathStatus.isConfigured) {
    log.info('PATH not configured, configuring now...')
    const pathResult = await configureShellPath()
    if (!pathResult.success) {
      log.warn('Failed to configure PATH, user may need to add manually')
    }
  }

  log.info('CLI alignment validation passed')
  return { status: 'valid' }
}

/**
 * Handles validation results that can be auto-fixed without user interaction.
 * Returns the updated validation result after attempting auto-fixes.
 *
 * Cases handled automatically:
 * - valid: Updates marker file if needed
 * - fresh-install: Creates symlink and marker
 * - symlink-missing: Creates symlink and marker
 *
 * Cases requiring user interaction (returned as-is for renderer to handle):
 * - external-cli-found: User must uninstall external CLI
 * - symlink-broken: User must confirm repair
 * - symlink-tampered: User must confirm restore
 */
export async function handleValidationResult(
  result: ValidationResult,
  platform: Platform = process.platform as Platform
): Promise<ValidationResult> {
  switch (result.status) {
    case 'valid': {
      log.info('CLI alignment is valid')

      // Update marker file if desktop version changed (app was updated) or cli_version is unknown
      const marker = readMarkerFile()
      const currentDesktopVersion = app.getVersion()
      const needsUpdate =
        marker &&
        (marker.desktop_version !== currentDesktopVersion ||
          marker.cli_version === 'unknown')

      if (needsUpdate) {
        log.info(
          `Updating marker file (desktop: ${marker.desktop_version} -> ${currentDesktopVersion}, cli: ${marker.cli_version})...`
        )
        const bundledPath = getBundledCliPath()
        const cliPath = getDesktopCliPath(platform)
        const cliInfo = await getCliInfo(cliPath)
        createMarkerForDesktopInstall(
          cliInfo.version ?? 'unknown',
          platform === 'win32' ? undefined : bundledPath,
          marker.cli_checksum
        )
      }

      return { status: 'valid' }
    }

    // These cases require user interaction - return as-is for renderer to handle
    case 'external-cli-found':
      log.info('External CLI found - renderer will show issue page')
      return result

    case 'symlink-broken':
      log.info('Symlink broken - renderer will show issue page')
      return result

    case 'symlink-tampered':
      log.info('Symlink tampered - renderer will show issue page')
      return result

    // These cases can be auto-fixed without user interaction
    case 'symlink-missing':
    case 'fresh-install': {
      log.info('Performing fresh CLI installation...')

      const symlinkResult = createSymlink(platform)
      if (!symlinkResult.success) {
        log.error(`Failed to create CLI symlink: ${symlinkResult.error}`)
        // Return a special error status - the app can still run
        return result
      }

      const bundledPath = getBundledCliPath()
      const cliPath = getDesktopCliPath(platform)
      const cliInfo = await getCliInfo(cliPath)

      createMarkerForDesktopInstall(
        cliInfo.version ?? 'unknown',
        platform === 'win32' ? undefined : bundledPath,
        symlinkResult.checksum
      )

      log.info(`CLI installed: version=${cliInfo.version}, path=${cliPath}`)

      const pathResult = await configureShellPath()
      if (!pathResult.success) {
        log.warn(
          'Failed to configure shell PATH, user may need to add manually'
        )
      }

      log.info('Fresh CLI installation completed successfully')
      return { status: 'valid' }
    }
  }
}

/**
 * Repairs a broken or tampered symlink.
 * Called from renderer via IPC when user confirms repair.
 */
export async function repairCliSymlink(
  platform: Platform = process.platform as Platform
): Promise<{ success: boolean; error?: string }> {
  log.info('Repairing CLI symlink...')

  const result = repairSymlink(platform)
  if (!result.success) {
    log.error(`Failed to repair symlink: ${result.error}`)
    return result
  }

  // Update marker file after repair
  const bundledPath = getBundledCliPath()
  const cliPath = getDesktopCliPath(platform)
  const cliInfo = await getCliInfo(cliPath)
  createMarkerForDesktopInstall(
    cliInfo.version ?? 'unknown',
    platform === 'win32' ? undefined : bundledPath,
    result.checksum
  )

  log.info('Symlink repaired successfully')
  return { success: true }
}

export async function getCliAlignmentStatus(
  platform: Platform = process.platform as Platform
): Promise<CliAlignmentStatus> {
  const cliPath = getDesktopCliPath(platform)
  const marker = readMarkerFile()
  const symlink = checkSymlink(platform)
  const cliInfo = await getCliInfo(cliPath)

  return {
    isManaged: marker !== null && symlink.isOurBinary,
    cliPath,
    cliVersion: cliInfo.version,
    installMethod: marker?.install_method ?? null,
    symlinkTarget: symlink.target,
    isValid: symlink.exists && symlink.targetExists && symlink.isOurBinary,
    lastValidated: new Date().toISOString(),
  }
}

export async function reinstallCliSymlink(
  platform: Platform = process.platform as Platform
): Promise<{ success: boolean; error?: string }> {
  const result = createSymlink(platform)

  if (result.success) {
    const bundledPath = getBundledCliPath()
    const cliInfo = await getCliInfo(bundledPath)
    createMarkerForDesktopInstall(
      cliInfo.version ?? 'unknown',
      platform === 'win32' ? undefined : bundledPath,
      result.checksum
    )
  }

  return result
}
