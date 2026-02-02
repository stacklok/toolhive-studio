/**
 * CLI Alignment Constants (THV-0020)
 */

import { homedir } from 'node:os'
import path from 'node:path'
import type { Platform } from './types'

/** Paths checked for package manager installations (Homebrew, Winget, etc.) */
export const EXTERNAL_CLI_PATHS: Record<Platform, string[]> = {
  darwin: ['/opt/homebrew/bin/thv', '/usr/local/bin/thv'],
  linux: [
    '/home/linuxbrew/.linuxbrew/bin/thv',
    '/usr/local/bin/thv',
    '/usr/bin/thv',
  ],
  win32: [
    path.join(
      process.env.ProgramFiles || 'C:\\Program Files',
      'toolhive',
      'thv.exe'
    ),
    path.join(
      process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local'),
      'Programs',
      'toolhive',
      'thv.exe'
    ),
  ],
}

export function getDesktopCliPath(
  platform: Platform = process.platform as Platform
): string {
  const home = homedir()

  switch (platform) {
    case 'darwin':
    case 'linux':
      return path.join(home, '.toolhive', 'bin', 'thv')
    case 'win32':
      return path.join(
        process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'),
        'ToolHive',
        'bin',
        'thv.exe'
      )
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

export function getMarkerFilePath(): string {
  return path.join(homedir(), '.toolhive', '.cli-source')
}

export function getShellRcFiles(): Record<string, string[]> {
  const home = homedir()

  return {
    bash: [path.join(home, '.bashrc'), path.join(home, '.bash_profile')],
    zsh: [path.join(home, '.zshrc')],
    fish: [path.join(home, '.config', 'fish', 'config.fish')],
  }
}

export const SHELL_PATH_ENTRY = 'export PATH="$HOME/.toolhive/bin:$PATH"'

export const SHELL_PATH_MARKERS = {
  start: '# Added by ToolHive Studio - do not modify this block',
  end: '# End ToolHive Studio',
}

export const FISH_PATH_ENTRY = 'fish_add_path -g $HOME/.toolhive/bin'

export function getCliSourceFromPath(
  cliPath: string,
  platform: Platform = process.platform as Platform
): 'homebrew' | 'winget' | 'manual' {
  const normalizedPath = cliPath.toLowerCase()

  if (platform === 'darwin' || platform === 'linux') {
    if (
      normalizedPath.includes('/homebrew/') ||
      normalizedPath.includes('/opt/homebrew/') ||
      normalizedPath.includes('/linuxbrew/')
    ) {
      return 'homebrew'
    }
  }

  if (platform === 'win32') {
    // Check for WinGet packages directory (e.g., stacklok.thv_Microsoft.Winget.Source_*)
    if (
      normalizedPath.includes('microsoft\\winget\\packages') ||
      normalizedPath.includes('microsoft/winget/packages')
    ) {
      return 'winget'
    }

    // Check for typical winget installation paths
    const programFiles = (process.env.ProgramFiles || '').toLowerCase()
    const localAppData = (process.env.LOCALAPPDATA || '').toLowerCase()

    if (
      normalizedPath.includes(programFiles) ||
      normalizedPath.includes(localAppData)
    ) {
      // Could be winget or manual - default to winget for program files
      if (normalizedPath.includes('programs')) {
        return 'winget'
      }
    }
  }

  return 'manual'
}

export function getUninstallInstructions(
  source: 'homebrew' | 'winget' | 'manual'
): string {
  switch (source) {
    case 'homebrew':
      return 'To uninstall, run:\n  brew uninstall thv'
    case 'winget':
      return 'To uninstall, run:\n  winget uninstall thv'
    case 'manual':
      return 'Please manually remove the external ToolHive CLI installation.'
  }
}
