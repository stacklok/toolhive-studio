export type ComplianceCheckSeverity = 'pass' | 'warn' | 'fail' | 'skip'

export interface SpecReference {
  id: string
  url?: string
}

export interface ComplianceCheckResult {
  id: string
  name: string
  severity: ComplianceCheckSeverity
  message: string
  description: string
  durationMs: number
  specReferences?: SpecReference[]
  details?: Record<string, unknown>
}

export interface ComplianceSummary {
  total: number
  passed: number
  warnings: number
  failed: number
  skipped: number
}

export interface ComplianceReport {
  serverName: string
  checkedAt: string
  totalDurationMs: number
  summary: ComplianceSummary
  checks: ComplianceCheckResult[]
}

export type ComplianceStatus =
  | 'compliant'
  | 'warnings'
  | 'non-compliant'
  | 'unchecked'
  | 'error'

export function deriveComplianceStatus(
  summary: ComplianceSummary
): ComplianceStatus {
  if (summary.failed > 0) return 'non-compliant'
  if (summary.warnings > 0) return 'warnings'
  return 'compliant'
}
