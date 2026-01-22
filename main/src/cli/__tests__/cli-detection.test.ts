import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { vol } from 'memfs'

// Create the mock async function using vi.hoisted so it's available when vi.mock factories run
const { mockExecFileAsync } = vi.hoisted(() => ({
  mockExecFileAsync: vi.fn(),
}))

// Mock dependencies - use memfs pattern like other tests
vi.mock('node:fs')

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return {
    ...actual,
    execFile: vi.fn(),
    default: {
      ...actual,
      execFile: vi.fn(),
    },
  }
})

// Mock promisify to return our controllable mock function
vi.mock('node:util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:util')>()
  return {
    ...actual,
    promisify: () => mockExecFileAsync,
    default: {
      ...actual,
      promisify: () => mockExecFileAsync,
    },
  }
})

vi.mock('../../logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}))

// Import after mocks are set up
import { detectExternalCli, getCliInfo } from '../cli-detection'

describe('cli-detection', () => {
  beforeEach(() => {
    vol.reset()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('detectExternalCli', () => {
    it('returns null when no external CLI is found', async () => {
      // Empty filesystem - no CLI files exist
      const result = await detectExternalCli('darwin')

      expect(result).toBeNull()
    })

    it('detects homebrew CLI on darwin', async () => {
      vol.fromJSON({
        '/opt/homebrew/bin/thv': 'binary content',
      })

      mockExecFileAsync.mockResolvedValue({
        stdout: 'thv version 1.2.3',
        stderr: '',
      })

      const result = await detectExternalCli('darwin')

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/opt/homebrew/bin/thv')
      expect(result?.source).toBe('homebrew')
      expect(result?.version).toBe('1.2.3')
    })

    it('detects CLI at /usr/local/bin on darwin', async () => {
      vol.fromJSON({
        '/usr/local/bin/thv': 'binary content',
      })

      mockExecFileAsync.mockResolvedValue({ stdout: 'v2.0.0', stderr: '' })

      const result = await detectExternalCli('darwin')

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/local/bin/thv')
      expect(result?.version).toBe('2.0.0')
    })

    it('detects CLI on linux', async () => {
      vol.fromJSON({
        '/usr/local/bin/thv': 'binary content',
      })

      mockExecFileAsync.mockResolvedValue({ stdout: '1.0.0', stderr: '' })

      const result = await detectExternalCli('linux')

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/local/bin/thv')
    })

    it('returns version as null when version command fails', async () => {
      vol.fromJSON({
        '/opt/homebrew/bin/thv': 'binary content',
      })

      mockExecFileAsync.mockRejectedValue(new Error('Command failed'))

      const result = await detectExternalCli('darwin')

      expect(result).not.toBeNull()
      expect(result?.version).toBeNull()
    })

    it('returns first CLI found when multiple exist', async () => {
      vol.fromJSON({
        '/opt/homebrew/bin/thv': 'binary content',
        '/usr/local/bin/thv': 'binary content',
      })

      mockExecFileAsync.mockResolvedValue({ stdout: '1.0.0', stderr: '' })

      const result = await detectExternalCli('darwin')

      // Should return the first path in EXTERNAL_CLI_PATHS.darwin
      expect(result?.path).toBe('/opt/homebrew/bin/thv')
    })
  })

  describe('getCliInfo', () => {
    it('returns exists: false when file does not exist', async () => {
      const result = await getCliInfo('/path/to/thv')

      expect(result).toEqual({
        exists: false,
        version: null,
        isExecutable: false,
      })
    })

    it('returns full info when binary exists and executes', async () => {
      vol.fromJSON({
        '/path/to/thv': 'binary content',
      })

      mockExecFileAsync.mockResolvedValue({
        stdout: 'thv version 1.5.0',
        stderr: '',
      })

      const result = await getCliInfo('/path/to/thv')

      expect(result).toEqual({
        exists: true,
        version: '1.5.0',
        isExecutable: true,
      })
    })

    it('returns isExecutable: false when version fails', async () => {
      vol.fromJSON({
        '/path/to/thv': 'binary content',
      })

      mockExecFileAsync.mockRejectedValue(new Error('Not executable'))

      const result = await getCliInfo('/path/to/thv')

      expect(result).toEqual({
        exists: true,
        version: null,
        isExecutable: false,
      })
    })
  })
})
