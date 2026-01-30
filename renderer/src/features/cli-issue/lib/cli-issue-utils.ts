/**
 * CLI Issue Utility Functions
 * Helper functions for CLI issue handling
 */

import type { CliSource } from '@common/types/cli'

/**
 * Returns the uninstall command for the given CLI source.
 * Returns null for manual installations where no command is available.
 */
export function getUninstallCommand(source: CliSource): string | null {
  switch (source) {
    case 'homebrew':
      return 'brew uninstall thv'
    case 'winget':
      return 'winget uninstall thv'
    case 'manual':
      return null
  }
}

/**
 * Returns a human-readable label for the CLI installation source.
 */
export function getSourceLabel(source: CliSource): string {
  switch (source) {
    case 'homebrew':
      return 'Homebrew'
    case 'winget':
      return 'Winget'
    case 'manual':
      return 'Manual installation'
  }
}
