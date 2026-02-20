import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CoreWorkload } from '@common/api/generated/types.gen'
import { computeSummary, runComplianceChecks } from '../mcp-compliance'
import { deriveComplianceStatus } from '@common/types/mcp-compliance'
import type { ComplianceCheckResult } from '@common/types/mcp-compliance'

vi.mock('../../logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

const { mockExecFile, mockMkdtemp, mockReaddir, mockReadFile, mockRm } =
  vi.hoisted(() => ({
    mockExecFile: vi.fn(),
    mockMkdtemp: vi.fn(),
    mockReaddir: vi.fn(),
    mockReadFile: vi.fn(),
    mockRm: vi.fn(),
  }))

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return {
    ...actual,
    execFile: mockExecFile,
    default: { ...actual, execFile: mockExecFile },
  }
})

vi.mock('node:util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:util')>()
  const mock = { ...actual, promisify: () => mockExecFile }
  return { ...mock, default: mock }
})

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  const mock = {
    ...actual,
    mkdtemp: mockMkdtemp,
    readdir: mockReaddir,
    readFile: mockReadFile,
    rm: mockRm,
  }
  return { ...mock, default: mock }
})

describe('computeSummary', () => {
  it('should count all severity types correctly', () => {
    const checks: ComplianceCheckResult[] = [
      {
        id: 'a',
        name: 'A',
        severity: 'pass',
        message: 'ok',
        description: 'Check A',
        durationMs: 10,
      },
      {
        id: 'b',
        name: 'B',
        severity: 'pass',
        message: 'ok',
        description: 'Check B',
        durationMs: 10,
      },
      {
        id: 'c',
        name: 'C',
        severity: 'warn',
        message: 'warn',
        description: 'Check C',
        durationMs: 10,
      },
      {
        id: 'd',
        name: 'D',
        severity: 'fail',
        message: 'fail',
        description: 'Check D',
        durationMs: 10,
      },
      {
        id: 'e',
        name: 'E',
        severity: 'skip',
        message: 'skip',
        description: 'Check E',
        durationMs: 0,
      },
    ]

    const summary = computeSummary(checks)

    expect(summary).toEqual({
      total: 5,
      passed: 2,
      warnings: 1,
      failed: 1,
      skipped: 1,
    })
  })

  it('should return zeros for empty checks', () => {
    const summary = computeSummary([])

    expect(summary).toEqual({
      total: 0,
      passed: 0,
      warnings: 0,
      failed: 0,
      skipped: 0,
    })
  })
})

describe('deriveComplianceStatus', () => {
  it('should return non-compliant when there are failures', () => {
    expect(
      deriveComplianceStatus({
        total: 3,
        passed: 1,
        warnings: 1,
        failed: 1,
        skipped: 0,
      })
    ).toBe('non-compliant')
  })

  it('should return warnings when there are warnings but no failures', () => {
    expect(
      deriveComplianceStatus({
        total: 3,
        passed: 2,
        warnings: 1,
        failed: 0,
        skipped: 0,
      })
    ).toBe('warnings')
  })

  it('should return compliant when all pass', () => {
    expect(
      deriveComplianceStatus({
        total: 3,
        passed: 3,
        warnings: 0,
        failed: 0,
        skipped: 0,
      })
    ).toBe('compliant')
  })

  it('should return compliant when all pass or skip', () => {
    expect(
      deriveComplianceStatus({
        total: 5,
        passed: 3,
        warnings: 0,
        failed: 0,
        skipped: 2,
      })
    ).toBe('compliant')
  })
})

describe('runComplianceChecks', () => {
  const baseWorkload: CoreWorkload = {
    name: 'test-server',
    port: 8080,
    transport_type: 'streamable-http',
    url: 'http://127.0.0.1:8080/mcp',
    status: 'running',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockMkdtemp.mockResolvedValue('/tmp/mcp-conformance-test')
    mockRm.mockResolvedValue(undefined)
  })

  it('should return a report with passed checks from conformance output', async () => {
    mockExecFile.mockResolvedValue({ stdout: '', stderr: '' })
    mockReaddir.mockResolvedValue([
      { name: 'server-initialize-2026', isDirectory: () => true },
      { name: 'ping-2026', isDirectory: () => true },
    ])
    mockReadFile.mockImplementation((filePath: string) => {
      if (filePath.includes('server-initialize')) {
        return Promise.resolve(
          JSON.stringify([
            {
              id: 'server-initialize',
              name: 'ServerInitialize',
              description: 'Server responds to initialize request',
              status: 'SUCCESS',
              timestamp: '2026-01-01T00:00:00Z',
            },
          ])
        )
      }
      return Promise.resolve(
        JSON.stringify([
          {
            id: 'ping',
            name: 'Ping',
            description: 'Server responds to ping',
            status: 'SUCCESS',
            timestamp: '2026-01-01T00:00:00Z',
          },
        ])
      )
    })

    const report = await runComplianceChecks(baseWorkload)

    expect(report.serverName).toBe('test-server')
    expect(report.summary.passed).toBe(2)
    expect(report.summary.failed).toBe(0)
    expect(report.checks).toHaveLength(2)
    expect(report.checks[0]!.severity).toBe('pass')
  })

  it('should handle failed checks from conformance output', async () => {
    // execFile throws on non-zero exit (tests failed) — that's expected
    mockExecFile.mockRejectedValue(
      Object.assign(new Error('exit code 1'), { code: 1 })
    )
    mockReaddir.mockResolvedValue([
      { name: 'server-initialize-2026', isDirectory: () => true },
    ])
    mockReadFile.mockResolvedValue(
      JSON.stringify([
        {
          id: 'server-initialize',
          name: 'ServerInitialize',
          description: 'Server responds to initialize request',
          status: 'FAILURE',
          timestamp: '2026-01-01T00:00:00Z',
          errorMessage: 'Connection refused',
        },
      ])
    )

    const report = await runComplianceChecks(baseWorkload)

    expect(report.summary.failed).toBe(1)
    const initCheck = report.checks.find(
      (c) => c.id === 'server-initialize'
    )
    expect(initCheck?.severity).toBe('fail')
    expect(initCheck?.message).toBe('Connection refused')
  })

  it('should handle timeout', async () => {
    mockExecFile.mockRejectedValue(
      Object.assign(new Error('timed out'), {
        killed: true,
        code: 'ERR_CHILD_PROCESS_TIMEOUT',
      })
    )

    await expect(runComplianceChecks(baseWorkload)).rejects.toThrow(
      'Conformance checks timed out'
    )
  })

  it('should report fallback when no output files exist', async () => {
    mockExecFile.mockRejectedValue(
      Object.assign(new Error('exit code 1'), { code: 1 })
    )
    mockReaddir.mockResolvedValue([])

    const report = await runComplianceChecks(baseWorkload)

    expect(report.summary.failed).toBe(1)
    expect(report.checks[0]!.id).toBe('conformance.run')
    expect(report.checks[0]!.message).toContain('No results produced')
  })

  it('should map WARNING status to warn severity', async () => {
    mockExecFile.mockResolvedValue({ stdout: '', stderr: '' })
    mockReaddir.mockResolvedValue([
      { name: 'dns-rebinding-2026', isDirectory: () => true },
    ])
    mockReadFile.mockResolvedValue(
      JSON.stringify([
        {
          id: 'dns-rebinding',
          name: 'DNSRebinding',
          description: 'DNS rebinding protection',
          status: 'WARNING',
          timestamp: '2026-01-01T00:00:00Z',
          errorMessage: 'No DNS rebinding protection detected',
        },
      ])
    )

    const report = await runComplianceChecks(baseWorkload)

    expect(report.summary.warnings).toBe(1)
    expect(report.checks[0]!.severity).toBe('warn')
  })

  it('should clean up temp directory even on error', async () => {
    mockExecFile.mockRejectedValue(
      Object.assign(new Error('timed out'), {
        killed: true,
        code: 'ERR_CHILD_PROCESS_TIMEOUT',
      })
    )

    try {
      await runComplianceChecks(baseWorkload)
    } catch {
      // expected
    }

    expect(mockRm).toHaveBeenCalledWith('/tmp/mcp-conformance-test', {
      recursive: true,
      force: true,
    })
  })
})
