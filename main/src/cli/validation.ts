/**
 * CLI Alignment Validation
 * Every-launch validation logic for CLI alignment (THV-0020)
 */

import { app } from 'electron'
import * as Sentry from '@sentry/electron/main'
import { detectExternalCli, getCliInfo } from './cli-detection'
import { readMarkerFile, createMarkerForDesktopInstall } from './marker-file'
import {
  checkSymlink,
  createSymlink,
  getBundledCliPath,
  getMarkerTargetPath,
  isFlatpak,
  repairSymlink,
} from './symlink-manager'
import { configureShellPath, checkPathConfiguration } from './path-configurator'
import { getDesktopCliPath } from './constants'
import type { ValidationResult } from '@common/types/cli'
import type { CliAlignmentStatus, Platform } from './types'
import log from '../logger'

export async function validateCliAlignment(
  platform: Platform = process.platform as Platform
): Promise<ValidationResult> {
  return Sentry.startSpanManual(
    {
      name: 'CLI alignment validation',
      op: 'cli.validation',
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        'cli.platform': platform,
      },
    },
    async (span) => {
      log.info('Starting CLI alignment validation...')

      const external = await detectExternalCli(platform)
      if (external) {
        log.warn(`External CLI found at: ${external.path}`)
        span.setAttributes({
          'cli.status': 'external-cli-found',
          'cli.external_path': external.path,
          'cli.external_source': external.source,
        })
        span.end()
        return { status: 'external-cli-found', cli: external }
      }

      const marker = readMarkerFile()

      if (!marker) {
        log.info('No marker file found, treating as fresh install')
        span.setAttributes({ 'cli.status': 'fresh-install' })
        span.end()
        return { status: 'fresh-install' }
      }

      const symlink = checkSymlink(platform)

      if (!symlink.exists) {
        log.warn('CLI alignment issue: symlink-missing')
        span.setAttributes({ 'cli.status': 'symlink-missing' })
        span.end()
        return { status: 'symlink-missing' }
      }

      if (!symlink.targetExists) {
        log.warn('CLI alignment issue: symlink-broken')
        span.setAttributes({
          'cli.status': 'symlink-broken',
          'cli.symlink_target': symlink.target ?? 'unknown',
        })
        span.end()
        return { status: 'symlink-broken', target: symlink.target ?? 'unknown' }
      }

      if (!symlink.isOurBinary) {
        log.warn('CLI alignment issue: symlink-tampered')
        span.setAttributes({
          'cli.status': 'symlink-tampered',
          'cli.symlink_target': symlink.target ?? 'unknown',
        })
        span.end()
        return {
          status: 'symlink-tampered',
          target: symlink.target ?? 'unknown',
        }
      }

      // Check and configure PATH if needed
      const pathStatus = await checkPathConfiguration()
      if (!pathStatus.isConfigured) {
        log.info('PATH not configured, configuring now...')
        const pathResult = await configureShellPath()
        span.setAttribute('cli.path_configured', pathResult.success)
        if (!pathResult.success) {
          log.warn('Failed to configure PATH, user may need to add manually')
        }
      } else {
        span.setAttribute('cli.path_configured', true)
      }

      log.info('CLI alignment validation passed')
      span.setAttributes({ 'cli.status': 'valid' })
      span.end()
      return { status: 'valid' }
    }
  )
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
  return Sentry.startSpanManual(
    {
      name: 'CLI handle validation result',
      op: 'cli.handle_result',
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        'cli.input_status': result.status,
        'cli.platform': platform,
      },
    },
    async (span) => {
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
            span.setAttributes({
              'cli.marker_updated': true,
              'cli.old_desktop_version': marker.desktop_version,
              'cli.new_desktop_version': currentDesktopVersion,
            })

            const cliPath = getDesktopCliPath(platform)

            // On Windows, we need to recopy the CLI since it's a copy not a symlink
            if (platform === 'win32') {
              log.info('Recopying CLI on Windows after app update...')
              const symlinkResult = createSymlink(platform)
              if (symlinkResult.success) {
                span.setAttribute('cli.windows_recopy', true)
                const cliInfo = await getCliInfo(cliPath)
                createMarkerForDesktopInstall({
                  cliVersion: cliInfo.version ?? 'unknown',
                  cliChecksum: symlinkResult.checksum,
                  platform,
                })
              } else {
                // Don't update marker on failure - next launch will retry
                log.error(
                  `Failed to recopy CLI on Windows: ${symlinkResult.error}`
                )
                span.setAttributes({
                  'cli.windows_recopy': false,
                  'cli.windows_recopy_error': symlinkResult.error ?? 'unknown',
                })
              }
            } else {
              // macOS/Linux: symlink auto-updates, just update marker
              const cliInfo = await getCliInfo(cliPath)
              const targetPath = getMarkerTargetPath()
              createMarkerForDesktopInstall({
                cliVersion: cliInfo.version ?? 'unknown',
                symlinkTarget: isFlatpak() ? undefined : targetPath,
                cliChecksum: marker.cli_checksum,
                platform,
                flatpakTarget: isFlatpak() ? targetPath : undefined,
              })
            }
          }

          span.setAttributes({ 'cli.output_status': 'valid' })
          span.end()
          return { status: 'valid' }
        }

        // These cases require user interaction - return as-is for renderer to handle
        case 'external-cli-found':
          log.info('External CLI found - renderer will show issue page')
          span.setAttributes({
            'cli.output_status': 'external-cli-found',
            'cli.action_required': 'uninstall_external',
          })
          span.end()
          return result

        case 'symlink-broken':
          log.info('Symlink broken - renderer will show issue page')
          span.setAttributes({
            'cli.output_status': 'symlink-broken',
            'cli.action_required': 'repair_symlink',
          })
          span.end()
          return result

        case 'symlink-tampered':
          log.info('Symlink tampered - renderer will show issue page')
          span.setAttributes({
            'cli.output_status': 'symlink-tampered',
            'cli.action_required': 'restore_symlink',
          })
          span.end()
          return result

        // These cases can be auto-fixed without user interaction
        case 'symlink-missing':
        case 'fresh-install': {
          log.info('Performing fresh CLI installation...')

          const symlinkResult = createSymlink(platform)
          if (!symlinkResult.success) {
            log.error(`Failed to create CLI symlink: ${symlinkResult.error}`)
            span.setAttributes({
              'cli.output_status': 'error',
              'cli.error': symlinkResult.error ?? 'unknown',
              'cli.success': false,
            })
            span.end()
            // Return a special error status - the app can still run
            return result
          }

          const cliPath = getDesktopCliPath(platform)
          const cliInfo = await getCliInfo(cliPath)
          const targetPath = getMarkerTargetPath()

          createMarkerForDesktopInstall({
            cliVersion: cliInfo.version ?? 'unknown',
            symlinkTarget:
              platform === 'win32' || isFlatpak() ? undefined : targetPath,
            cliChecksum: symlinkResult.checksum,
            flatpakTarget: isFlatpak() ? targetPath : undefined,
          })

          log.info(`CLI installed: version=${cliInfo.version}, path=${cliPath}`)

          const pathResult = await configureShellPath()
          if (!pathResult.success) {
            log.warn(
              'Failed to configure shell PATH, user may need to add manually'
            )
          }

          log.info('Fresh CLI installation completed successfully')
          span.setAttributes({
            'cli.output_status': 'valid',
            'cli.fresh_install': true,
            'cli.version': cliInfo.version ?? 'unknown',
            'cli.path': cliPath,
            'cli.path_configured': pathResult.success,
          })
          span.end()
          return { status: 'valid' }
        }
      }
    }
  )
}

/**
 * Repairs a broken or tampered symlink.
 * Called from renderer via IPC when user confirms repair.
 */
export async function repairCliSymlink(
  platform: Platform = process.platform as Platform
): Promise<{ success: boolean; error?: string }> {
  return Sentry.startSpanManual(
    {
      name: 'CLI repair symlink',
      op: 'cli.repair',
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        'cli.platform': platform,
      },
    },
    async (span) => {
      log.info('Repairing CLI symlink...')

      const result = repairSymlink(platform)
      if (!result.success) {
        log.error(`Failed to repair symlink: ${result.error}`)
        span.setAttributes({
          'cli.success': false,
          'cli.error': result.error ?? 'unknown',
        })
        span.end()
        return result
      }

      // Update marker file after repair
      const cliPath = getDesktopCliPath(platform)
      const cliInfo = await getCliInfo(cliPath)
      const targetPath = getMarkerTargetPath()
      createMarkerForDesktopInstall({
        cliVersion: cliInfo.version ?? 'unknown',
        symlinkTarget:
          platform === 'win32' || isFlatpak() ? undefined : targetPath,
        cliChecksum: result.checksum,
        flatpakTarget: isFlatpak() ? targetPath : undefined,
      })

      log.info('Symlink repaired successfully')
      span.setAttributes({
        'cli.success': true,
        'cli.version': cliInfo.version ?? 'unknown',
        'cli.path': cliPath,
      })
      span.end()
      return { success: true }
    }
  )
}

export async function getCliAlignmentStatus(
  platform: Platform = process.platform as Platform
): Promise<CliAlignmentStatus> {
  return Sentry.startSpanManual(
    {
      name: 'CLI get alignment status',
      op: 'cli.get_status',
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        'cli.platform': platform,
      },
    },
    async (span) => {
      const cliPath = getDesktopCliPath(platform)
      const marker = readMarkerFile()
      const symlink = checkSymlink(platform)
      const cliInfo = await getCliInfo(cliPath)

      const status = {
        isManaged: marker !== null && symlink.isOurBinary,
        cliPath,
        cliVersion: cliInfo.version,
        installMethod: marker?.install_method ?? null,
        symlinkTarget: symlink.target,
        isValid: symlink.exists && symlink.targetExists && symlink.isOurBinary,
        lastValidated: new Date().toISOString(),
      }

      span.setAttributes({
        'cli.is_managed': status.isManaged,
        'cli.is_valid': status.isValid,
        'cli.version': status.cliVersion ?? 'unknown',
        'cli.install_method': status.installMethod ?? 'none',
      })
      span.end()

      return status
    }
  )
}

export async function reinstallCliSymlink(
  platform: Platform = process.platform as Platform
): Promise<{ success: boolean; error?: string }> {
  return Sentry.startSpanManual(
    {
      name: 'CLI reinstall symlink',
      op: 'cli.reinstall',
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        'cli.platform': platform,
      },
    },
    async (span) => {
      const result = createSymlink(platform)

      if (result.success) {
        const bundledPath = getBundledCliPath()
        const cliInfo = await getCliInfo(bundledPath)
        const targetPath = getMarkerTargetPath()
        createMarkerForDesktopInstall({
          cliVersion: cliInfo.version ?? 'unknown',
          symlinkTarget:
            platform === 'win32' || isFlatpak() ? undefined : targetPath,
          cliChecksum: result.checksum,
          flatpakTarget: isFlatpak() ? targetPath : undefined,
        })
        span.setAttributes({
          'cli.success': true,
          'cli.version': cliInfo.version ?? 'unknown',
        })
      } else {
        span.setAttributes({
          'cli.success': false,
          'cli.error': result.error ?? 'unknown',
        })
      }

      span.end()
      return result
    }
  )
}
