/**
 * CLI Alignment Types
 * Defines all TypeScript interfaces for CLI version alignment (THV-0020)
 */

/**
 * Marker file schema for tracking CLI installation source.
 * Stored at ~/.toolhive/.cli-source
 */
export interface CliSourceMarker {
  /** Schema version for future compatibility */
  schema_version: 1
  /** Source of CLI installation - always 'desktop' for Desktop-managed CLI */
  source: 'desktop'
  /** Installation method used */
  install_method: 'symlink' | 'copy' | 'wrapper'
  /** Version of the CLI binary */
  cli_version: string
  /** Path the symlink points to (macOS/Linux only) */
  symlink_target?: string
  /** Checksum of the CLI binary (Windows only, for copy validation) */
  cli_checksum?: string
  /** ISO timestamp of when CLI was installed */
  installed_at: string
  /** Version of ToolHive Desktop that installed this CLI */
  desktop_version: string
}

/**
 * Status information for CLI alignment (exposed to renderer)
 */
export interface CliAlignmentStatus {
  /** Whether CLI is currently managed by Desktop */
  isManaged: boolean
  /** Path to the Desktop-managed CLI */
  cliPath: string
  /** Version of the managed CLI */
  cliVersion: string | null
  /** Installation method used */
  installMethod: 'symlink' | 'copy' | 'wrapper' | null
  /** Path the symlink points to (macOS/Linux) or null (Windows) */
  symlinkTarget: string | null
  /** Whether the CLI installation is valid */
  isValid: boolean
  /** Last validation timestamp */
  lastValidated: string
}

/**
 * Shell PATH configuration status
 */
export interface PathConfigStatus {
  /** Whether PATH is correctly configured */
  isConfigured: boolean
  /** Shell RC files that have been modified */
  modifiedFiles: string[]
  /** The PATH entry that was added */
  pathEntry: string
}

/**
 * Result of symlink check operation
 */
export interface SymlinkCheckResult {
  /** Whether the symlink exists */
  exists: boolean
  /** Whether the symlink target exists */
  targetExists: boolean
  /** The actual target path of the symlink */
  target: string | null
  /** Whether the target is our bundled binary */
  isOurBinary: boolean
}

/**
 * Platform type for type-safe platform checks
 */
export type Platform = 'darwin' | 'linux' | 'win32'
