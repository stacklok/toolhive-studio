// Desktop owns CLI installation, preventing version mismatches
export {
  validateCliAlignment,
  handleValidationResult,
  getCliAlignmentStatus,
  reinstallCliSymlink,
  repairCliSymlink,
} from './validation'
export type { ValidationResult } from './types'
