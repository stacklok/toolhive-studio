import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { vol } from 'memfs'
import {
  readMarkerFile,
  writeMarkerFile,
  deleteMarkerFile,
  createMarkerForDesktopInstall,
} from '../marker-file'
import type { CliSourceMarker } from '../types'

vi.mock('node:fs')

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getVersion: () => '1.0.0',
  },
}))

vi.mock('../constants', () => ({
  getMarkerFilePath: () => '/home/testuser/.toolhive/.cli-source',
}))

vi.mock('../symlink-manager', () => ({
  isFlatpak: () => false,
}))

vi.mock('../../logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('marker-file', () => {
  const validMarker: CliSourceMarker = {
    schema_version: 1,
    source: 'desktop',
    install_method: 'symlink',
    cli_version: '1.0.0',
    symlink_target: '/path/to/bundled/thv',
    installed_at: '2024-01-01T00:00:00.000Z',
    desktop_version: '1.0.0',
  }

  beforeEach(() => {
    vol.reset()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('readMarkerFile', () => {
    it('returns null when file does not exist', () => {
      const result = readMarkerFile()
      expect(result).toBeNull()
    })

    it('returns parsed marker when file exists and is valid', () => {
      vol.fromJSON({
        '/home/testuser/.toolhive/.cli-source': JSON.stringify(validMarker),
      })

      const result = readMarkerFile()

      expect(result).toEqual(validMarker)
    })

    it('returns null for invalid JSON', () => {
      vol.fromJSON({
        '/home/testuser/.toolhive/.cli-source': 'invalid json',
      })

      const result = readMarkerFile()

      expect(result).toBeNull()
    })

    it('returns null for wrong schema version', () => {
      vol.fromJSON({
        '/home/testuser/.toolhive/.cli-source': JSON.stringify({
          ...validMarker,
          schema_version: 2,
        }),
      })

      const result = readMarkerFile()

      expect(result).toBeNull()
    })

    it('returns null for wrong source', () => {
      vol.fromJSON({
        '/home/testuser/.toolhive/.cli-source': JSON.stringify({
          ...validMarker,
          source: 'homebrew',
        }),
      })

      const result = readMarkerFile()

      expect(result).toBeNull()
    })
  })

  describe('writeMarkerFile', () => {
    it('creates directory if it does not exist', () => {
      const result = writeMarkerFile({
        source: 'desktop',
        install_method: 'symlink',
        cli_version: '1.0.0',
        installed_at: '2024-01-01T00:00:00.000Z',
        desktop_version: '1.0.0',
      })

      expect(result).toBe(true)
      expect(vol.existsSync('/home/testuser/.toolhive')).toBe(true)
    })

    it('writes marker file with schema version', () => {
      writeMarkerFile({
        source: 'desktop',
        install_method: 'symlink',
        cli_version: '1.0.0',
        installed_at: '2024-01-01T00:00:00.000Z',
        desktop_version: '1.0.0',
      })

      const content = vol.readFileSync(
        '/home/testuser/.toolhive/.cli-source',
        'utf8'
      )
      expect(content).toContain('"schema_version": 1')
    })

    it('returns true on success', () => {
      const result = writeMarkerFile({
        source: 'desktop',
        install_method: 'symlink',
        cli_version: '1.0.0',
        installed_at: '2024-01-01T00:00:00.000Z',
        desktop_version: '1.0.0',
      })

      expect(result).toBe(true)
    })
  })

  describe('deleteMarkerFile', () => {
    it('returns true when file does not exist', () => {
      const result = deleteMarkerFile()

      expect(result).toBe(true)
    })

    it('deletes file and returns true', () => {
      vol.fromJSON({
        '/home/testuser/.toolhive/.cli-source': JSON.stringify(validMarker),
      })

      const result = deleteMarkerFile()

      expect(result).toBe(true)
      expect(vol.existsSync('/home/testuser/.toolhive/.cli-source')).toBe(false)
    })
  })

  describe('createMarkerForDesktopInstall', () => {
    it('creates marker with symlink method on non-Windows', () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'darwin' })

      createMarkerForDesktopInstall('1.0.0', '/path/to/thv', undefined)

      const content = vol.readFileSync(
        '/home/testuser/.toolhive/.cli-source',
        'utf8'
      )
      expect(content).toContain('"install_method": "symlink"')
      expect(content).toContain('"symlink_target": "/path/to/thv"')

      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('creates marker with copy method on Windows', () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })

      createMarkerForDesktopInstall('1.0.0', undefined, 'abc123checksum')

      const content = vol.readFileSync(
        '/home/testuser/.toolhive/.cli-source',
        'utf8'
      )
      expect(content).toContain('"install_method": "copy"')
      expect(content).toContain('"cli_checksum": "abc123checksum"')

      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })
  })
})
