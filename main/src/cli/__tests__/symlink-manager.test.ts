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

    it('handles Windows copy (checks existence)', () => {
      vol.fromJSON({
        'C:\\Users\\test\\AppData\\Local\\ToolHive\\bin\\thv.exe':
          'binary content',
      })

      const result = checkSymlink('win32')

      expect(result.exists).toBe(true)
      expect(result.isOurBinary).toBe(true)
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
