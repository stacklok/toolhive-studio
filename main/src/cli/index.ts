/**
 * CLI Module
 * Desktop owns CLI installation, preventing version mismatches (THV-0020)
 *
 * @module cli
 */

// ────────────────────────────────────────────────────────────────────────────
//  Validation (Public API)
// ────────────────────────────────────────────────────────────────────────────

export {
  validateCliAlignment,
  handleValidationResult,
  getCliAlignmentStatus,
  reinstallCliSymlink,
  removeCliInstallation,
  repairCliSymlink,
} from './validation'

// ────────────────────────────────────────────────────────────────────────────
//  Types (Public API)
// ────────────────────────────────────────────────────────────────────────────

export type { ValidationResult, ExternalCliInfo } from './types'

// ────────────────────────────────────────────────────────────────────────────
//  Constants (Public API)
// ────────────────────────────────────────────────────────────────────────────

export { getUninstallInstructions } from './constants'
