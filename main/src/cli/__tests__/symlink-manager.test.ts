import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { vol } from 'memfs'
import {
  getBundledCliPath,
  isOurBinary,
  checkSymlink,
  createSymlink,
  removeSymlink,
} from '../symlink-manager'

// Mock dependencies - use memfs pattern like other tests
vi.mock('node:fs')

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}))

vi.mock('../../toolhive-manager', () => ({
  binPath: '/app/resources/bin/darwin-arm64/thv',
}))

vi.mock('../constants', () => ({
  getDesktopCliPath: (platform: string) => {
    if (platform === 'win32')
      return 'C:\\Users\\test\\AppData\\Local\\ToolHive\\bin\\thv.exe'
    return '/home/testuser/.toolhive/bin/thv'
  },
}))

// SHA256 of 'binary content' for Windows checksum verification
const TEST_BINARY_CHECKSUM =
  '93a0b24644f2e0fd11d6b422c90275c482b0cc20be4a4e3f62148ed2932b4792'

vi.mock('../marker-file', () => ({
  readMarkerFile: vi.fn(() => ({
    source: 'desktop',
    cli_checksum: TEST_BINARY_CHECKSUM,
  })),
}))

vi.mock('../../logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('symlink-manager', () => {
  beforeEach(() => {
    vol.reset()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getBundledCliPath', () => {
    it('returns the bundled CLI path', () => {
      const path = getBundledCliPath()
      expect(path).toBe('/app/resources/bin/darwin-arm64/thv')
    })
  })

  describe('isOurBinary', () => {
    it('returns true for exact bundled path match', () => {
      const result = isOurBinary('/app/resources/bin/darwin-arm64/thv')
      expect(result).toBe(true)
    })

    it('returns false for different path', () => {
      const result = isOurBinary('/opt/homebrew/bin/thv')
      expect(result).toBe(false)
    })
  })

  describe('checkSymlink', () => {
    it('returns exists: false when symlink does not exist', () => {
      const result = checkSymlink('darwin')

      expect(result).toEqual({
        exists: false,
        targetExists: false,
        target: null,
        isOurBinary: false,
      })
    })

    it('handles Windows copy with valid checksum', () => {
      vol.fromJSON({
        'C:\\Users\\test\\AppData\\Local\\ToolHive\\bin\\thv.exe':
          'binary content',
      })

      const result = checkSymlink('win32')

      expect(result.exists).toBe(true)
      expect(result.isOurBinary).toBe(true)
    })

    it('returns isOurBinary: false on Windows when checksum is missing (security)', async () => {
      const { readMarkerFile } = await import('../marker-file')
      vi.mocked(readMarkerFile).mockReturnValueOnce({
        schema_version: 1,
        source: 'desktop',
        install_method: 'copy',
        cli_version: '1.0.0',
        cli_checksum: undefined, // No checksum stored
        installed_at: new Date().toISOString(),
        desktop_version: '1.0.0',
      })

      vol.fromJSON({
        'C:\\Users\\test\\AppData\\Local\\ToolHive\\bin\\thv.exe':
          'binary content',
      })

      const result = checkSymlink('win32')

      expect(result.exists).toBe(true)
      // Security: Without checksum, we cannot verify the binary
      expect(result.isOurBinary).toBe(false)
    })
  })

  describe('createSymlink', () => {
    it('returns error when bundled binary does not exist', () => {
      const result = createSymlink('darwin')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('creates directory if needed', () => {
      vol.fromJSON({
        '/app/resources/bin/darwin-arm64/thv': 'binary content',
      })

      createSymlink('darwin')

      expect(vol.existsSync('/home/testuser/.toolhive/bin')).toBe(true)
    })

    it('creates symlink on darwin/linux', () => {
      vol.fromJSON({
        '/app/resources/bin/darwin-arm64/thv': 'binary content',
      })

      const result = createSymlink('darwin')

      expect(result.success).toBe(true)
      // Note: memfs has limited symlink support, so we check success
    })

    it('copies binary on Windows', () => {
      vol.fromJSON({
        '/app/resources/bin/darwin-arm64/thv': 'binary content',
      })

      const result = createSymlink('win32')

      expect(result.success).toBe(true)
      expect(result.checksum).toBeDefined()
    })
  })

  describe('checkSymlink (flatpak)', () => {
    it('detects a valid flatpak wrapper script', () => {
      const wrapper =
        '#!/bin/sh\nexec flatpak run --command=/app/toolhive/resources/bin/linux-x64/thv com.stacklok.ToolHive "$@"\n'
      vol.fromJSON({
        '/.flatpak-info': '',
        '/home/testuser/.toolhive/bin/thv': wrapper,
      })

      const result = checkSymlink('linux')

      expect(result.exists).toBe(true)
      expect(result.targetExists).toBe(true)
      expect(result.isOurBinary).toBe(true)
    })

    it('returns isOurBinary: false for non-wrapper file in flatpak', () => {
      vol.fromJSON({
        '/.flatpak-info': '',
        '/home/testuser/.toolhive/bin/thv': '#!/bin/sh\necho hello\n',
      })

      const result = checkSymlink('linux')

      expect(result.exists).toBe(true)
      expect(result.isOurBinary).toBe(false)
    })
  })

  describe('createSymlink (flatpak)', () => {
    it('creates a wrapper script instead of a symlink', () => {
      vol.fromJSON({
        '/.flatpak-info': '',
        '/app/resources/bin/darwin-arm64/thv': 'binary content',
      })

      const result = createSymlink('linux')

      expect(result.success).toBe(true)
      const content = vol.readFileSync(
        '/home/testuser/.toolhive/bin/thv',
        'utf8'
      )
      expect(content).toContain('#!/bin/sh')
      expect(content).toContain('flatpak run --command=')
      expect(content).toContain('com.stacklok.ToolHive')
    })

    it('wrapper script is executable', () => {
      vol.fromJSON({
        '/.flatpak-info': '',
        '/app/resources/bin/darwin-arm64/thv': 'binary content',
      })

      createSymlink('linux')

      const stats = vol.statSync('/home/testuser/.toolhive/bin/thv')
      // Check executable bit (0o755 = 493)
      expect(stats.mode! & 0o755).toBe(0o755)
    })
  })

  describe('removeSymlink', () => {
    it('returns success when symlink does not exist', () => {
      const result = removeSymlink('darwin')

      expect(result.success).toBe(true)
    })

    it('removes file and returns success', () => {
      vol.fromJSON({
        '/home/testuser/.toolhive/bin/thv': 'binary content',
      })

      const result = removeSymlink('darwin')

      expect(result.success).toBe(true)
      expect(vol.existsSync('/home/testuser/.toolhive/bin/thv')).toBe(false)
    })
  })
})
