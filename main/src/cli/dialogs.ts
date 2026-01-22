/**
 * CLI Alignment Dialogs (THV-0020)
 */

import { dialog } from 'electron'
import { getUninstallInstructions } from './constants'
import type { ExternalCliInfo } from './types'
import log from '../logger'

export function showExternalCliDialog(cli: ExternalCliInfo): 'quit' {
  const instructions = getUninstallInstructions(cli.source)
  const versionInfo = cli.version ? ` (version ${cli.version})` : ''
  const sourceLabel =
    cli.source === 'homebrew'
      ? 'Homebrew'
      : cli.source === 'winget'
        ? 'Winget'
        : 'Manual installation'

  log.info(`Showing external CLI dialog for: ${cli.path}`)

  dialog.showMessageBoxSync({
    type: 'error',
    title: 'External ToolHive CLI Detected',
    message: 'ToolHive Studio cannot run while an external CLI is installed.',
    detail: [
      `Found: ${cli.path}${versionInfo}`,
      `Source: ${sourceLabel}`,
      '',
      'ToolHive Studio manages its own CLI installation to ensure version compatibility.',
      'Please uninstall the external CLI and restart ToolHive Studio.',
      '',
      instructions,
    ].join('\n'),
    buttons: ['Quit'],
    defaultId: 0,
    noLink: true,
  })

  return 'quit'
}

export function showSymlinkBrokenDialog(target: string): boolean {
  log.info(`Showing symlink broken dialog for target: ${target}`)

  const result = dialog.showMessageBoxSync({
    type: 'warning',
    title: 'CLI Installation Needs Repair',
    message: 'The ToolHive CLI symlink is broken.',
    detail: [
      `The CLI was pointing to: ${target}`,
      '',
      'This can happen if ToolHive Studio was moved or updated.',
      '',
      'Would you like to repair the CLI installation?',
    ].join('\n'),
    buttons: ['Repair', 'Quit'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  })

  return result === 0
}

export function showSymlinkTamperedDialog(target: string): boolean {
  log.info(`Showing symlink tampered dialog for target: ${target}`)

  const result = dialog.showMessageBoxSync({
    type: 'warning',
    title: 'CLI Installation Modified',
    message: 'The ToolHive CLI has been modified externally.',
    detail: [
      `The CLI is currently pointing to: ${target}`,
      '',
      'This is not the bundled CLI from ToolHive Studio.',
      'This could cause version compatibility issues.',
      '',
      'Would you like to restore the correct CLI installation?',
    ].join('\n'),
    buttons: ['Restore', 'Quit'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  })

  return result === 0
}
