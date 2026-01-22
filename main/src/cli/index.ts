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
} from './validation'
