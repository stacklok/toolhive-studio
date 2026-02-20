import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { CoreWorkload } from '@common/api/generated/types.gen'
import type {
  ComplianceCheckResult,
  ComplianceReport,
  ComplianceSummary,
} from '@common/types/mcp-compliance'
import log from '../logger'

const execFileAsync = promisify(execFile)
const TIMEOUT_MS = 120_000

interface ConformanceCheck {
  id: string
  name: string
  description: string
  status: 'SUCCESS' | 'FAILURE' | 'WARNING' | 'SKIPPED' | 'INFO'
  timestamp: string
  errorMessage?: string
  specReferences?: { id: string; url?: string }[]
  details?: Record<string, unknown>
}

function getServerUrl(workload: CoreWorkload): string {
  if (workload.url) return workload.url
  return `http://localhost:${workload.port}/mcp`
}

function getConformanceBinPath(): string {
  // Resolve the conformance binary via require.resolve
  // This works both in dev (node_modules/.bin) and packaged (asar)
  const pkgEntry = require.resolve(
    '@modelcontextprotocol/conformance/dist/index.js'
  )
  return pkgEntry
}

function mapStatus(
  status: ConformanceCheck['status']
): ComplianceCheckResult['severity'] {
  switch (status) {
    case 'SUCCESS':
      return 'pass'
    case 'FAILURE':
      return 'fail'
    case 'WARNING':
      return 'warn'
    case 'SKIPPED':
    case 'INFO':
      return 'skip'
  }
}

function mapChecks(raw: ConformanceCheck[]): ComplianceCheckResult[] {
  return raw.map((c) => ({
    id: c.id,
    name: c.name,
    severity: mapStatus(c.status),
    message: c.errorMessage || c.description,
    description: c.description,
    durationMs: 0,
    specReferences: c.specReferences,
    details: c.details,
  }))
}

export function computeSummary(
  checks: ComplianceCheckResult[]
): ComplianceSummary {
  const summary: ComplianceSummary = {
    total: checks.length,
    passed: 0,
    warnings: 0,
    failed: 0,
    skipped: 0,
  }

  for (const check of checks) {
    switch (check.severity) {
      case 'pass':
        summary.passed++
        break
      case 'warn':
        summary.warnings++
        break
      case 'fail':
        summary.failed++
        break
      case 'skip':
        summary.skipped++
        break
    }
  }

  return summary
}

export async function runComplianceChecks(
  workload: CoreWorkload
): Promise<ComplianceReport> {
  const startTime = performance.now()
  const serverUrl = getServerUrl(workload)
  const binPath = getConformanceBinPath()

  log.info(
    `Starting conformance checks for ${workload.name ?? 'unknown'} at ${serverUrl}`
  )

  // Create a temp directory for results
  const outputDir = await mkdtemp(path.join(tmpdir(), 'mcp-conformance-'))

  try {
    // Run the conformance suite via CLI
    // The process may exit with code 1 if tests fail — that's expected
    try {
      await execFileAsync(
        process.execPath,
        [binPath, 'server', '--url', serverUrl, '--output-dir', outputDir],
        { timeout: TIMEOUT_MS }
      )
    } catch (error) {
      // execFile throws on non-zero exit code, which is normal when tests fail
      const execError = error as { code?: string; killed?: boolean }
      if (execError.killed || execError.code === 'ERR_CHILD_PROCESS_TIMEOUT') {
        throw new Error('Conformance checks timed out')
      }
      // Non-zero exit code is expected when some checks fail — continue
    }

    // Read all checks.json files from subdirectories
    const allChecks: ComplianceCheckResult[] = []
    const entries = await readdir(outputDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const checksFile = path.join(outputDir, entry.name, 'checks.json')
      try {
        const content = await readFile(checksFile, 'utf-8')
        const rawChecks: ConformanceCheck[] = JSON.parse(content)
        allChecks.push(...mapChecks(rawChecks))
      } catch {
        // Skip directories without valid checks.json
      }
    }

    // If no results were written (e.g. URL validation failed), report a single failure
    if (allChecks.length === 0) {
      allChecks.push({
        id: 'conformance.run',
        name: 'Run Conformance Suite',
        severity: 'fail',
        message: 'No results produced — the server may not be reachable',
        description: 'Run the full conformance test suite against the server',
        durationMs: Math.round(performance.now() - startTime),
      })
    }

    const totalDurationMs = Math.round(performance.now() - startTime)
    log.info(
      `Conformance checks for ${workload.name ?? 'unknown'}: ${allChecks.filter((c) => c.severity === 'pass').length}/${allChecks.length} passed in ${totalDurationMs}ms`
    )

    return {
      serverName: workload.name ?? '',
      checkedAt: new Date().toISOString(),
      totalDurationMs,
      summary: computeSummary(allChecks),
      checks: allChecks,
    }
  } finally {
    // Clean up temp directory
    rm(outputDir, { recursive: true, force: true }).catch(() => {})
  }
}
