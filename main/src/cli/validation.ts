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
  removeSymlink,
} from './symlink-manager'
import {
  configureShellPath,
  removeShellPath,
  checkPathConfiguration,
} from './path-configurator'
import {
  showExternalCliDialog,
  showSymlinkBrokenDialog,
  showSymlinkTamperedDialog,
} from './dialogs'
import { getDesktopCliPath } from './constants'
import { deleteMarkerFile } from './marker-file'
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

  // Check and configure PATH if needed (non-Windows only)
  if (platform !== 'win32') {
    const pathStatus = await checkPathConfiguration()
    if (!pathStatus.isConfigured) {
      log.info('PATH not configured, configuring now...')
      const pathResult = await configureShellPath()
      if (!pathResult.success) {
        log.warn('Failed to configure PATH, user may need to add manually')
      }
    }
  }

  log.info('CLI alignment validation passed')
  return { status: 'valid' }
}

/** Returns true if the app can proceed, false if it should quit. */
export async function handleValidationResult(
  result: ValidationResult,
  platform: Platform = process.platform as Platform
): Promise<boolean> {
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

      return true
    }

    case 'external-cli-found':
      showExternalCliDialog(result.cli)
      app.quit()
      return false

    case 'symlink-broken': {
      const shouldRepair = showSymlinkBrokenDialog(result.target)
      if (!shouldRepair) {
        app.quit()
        return false
      }

      const repairResult = repairSymlink(platform)
      if (!repairResult.success) {
        log.error(`Failed to repair symlink: ${repairResult.error}`)
        app.quit()
        return false
      }

      // Update marker file after repair
      const bundledPath = getBundledCliPath()
      const cliPath = getDesktopCliPath(platform)
      const cliInfo = await getCliInfo(cliPath)
      createMarkerForDesktopInstall(
        cliInfo.version ?? 'unknown',
        platform === 'win32' ? undefined : bundledPath,
        repairResult.checksum
      )

      log.info('Symlink repaired successfully')
      return true
    }

    case 'symlink-tampered': {
      const shouldFix = showSymlinkTamperedDialog(result.target)
      if (!shouldFix) {
        app.quit()
        return false
      }

      const fixResult = repairSymlink(platform)
      if (!fixResult.success) {
        log.error(`Failed to fix symlink: ${fixResult.error}`)
        app.quit()
        return false
      }

      // Update marker file after fix
      const bundledPathTampered = getBundledCliPath()
      const cliPathTampered = getDesktopCliPath(platform)
      const cliInfoTampered = await getCliInfo(cliPathTampered)
      createMarkerForDesktopInstall(
        cliInfoTampered.version ?? 'unknown',
        platform === 'win32' ? undefined : bundledPathTampered,
        fixResult.checksum
      )

      log.info('Symlink fixed successfully')
      return true
    }

    case 'symlink-missing':
    case 'fresh-install': {
      log.info('Performing fresh CLI installation...')

      const symlinkResult = createSymlink(platform)
      if (!symlinkResult.success) {
        log.error(`Failed to create CLI symlink: ${symlinkResult.error}`)
        app.quit()
        return false
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

      if (platform !== 'win32') {
        const pathResult = await configureShellPath()
        if (!pathResult.success) {
          log.warn(
            'Failed to configure shell PATH, user may need to add manually'
          )
        }
      }

      log.info('Fresh CLI installation completed successfully')
      return true
    }
  }
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

export async function removeCliInstallation(
  platform: Platform = process.platform as Platform
): Promise<{ success: boolean; error?: string }> {
  const symlinkResult = removeSymlink(platform)
  if (!symlinkResult.success) {
    return symlinkResult
  }

  deleteMarkerFile()

  if (platform !== 'win32') {
    await removeShellPath()
  }

  return { success: true }
}
