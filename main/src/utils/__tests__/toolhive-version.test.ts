import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  getChannel,
  getManifestUrl,
  parseVersionFromSquirrelReleases,
  fetchLatestRelease,
} from '../toolhive-version'

vi.mock('@sentry/electron/main', () => ({
  startSpan: vi.fn((_, callback) => {
    const mockSpan = {
      setStatus: vi.fn(),
      setAttribute: vi.fn(),
    }
    return callback(mockSpan)
  }),
  startSpanManual: vi.fn((_, callback) => {
    const mockSpan = {
      setStatus: vi.fn(),
      setAttribute: vi.fn(),
    }
    const mockFinish = vi.fn()
    return callback(mockSpan, mockFinish)
  }),
}))

vi.mock('../../util', () => ({
  getAppVersion: vi.fn(() => '1.0.0'),
}))

vi.mock('../../logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import log from '../../logger'

describe('toolhive-version', () => {
  const originalPlatform = process.platform
  const originalArch = process.arch
  const originalFetch = global.fetch

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    Object.defineProperty(process, 'arch', { value: originalArch })
    global.fetch = originalFetch
  })

  describe('getChannel', () => {
    it('returns stable for release versions', () => {
      expect(getChannel('1.0.0')).toBe('stable')
      expect(getChannel('0.24.0')).toBe('stable')
    })

    it('returns pre-release for alpha versions', () => {
      expect(getChannel('1.0.0-alpha.1')).toBe('pre-release')
    })

    it('returns pre-release for beta versions', () => {
      expect(getChannel('1.0.0-beta.2')).toBe('pre-release')
    })

    it('returns pre-release for rc versions', () => {
      expect(getChannel('1.0.0-rc.1')).toBe('pre-release')
      expect(getChannel('0.22.1-rc.0')).toBe('pre-release')
    })
  })

  describe('getManifestUrl', () => {
    it('returns S3 RELEASES.json for macOS stable', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      Object.defineProperty(process, 'arch', { value: 'arm64' })

      expect(getManifestUrl('1.0.0')).toBe(
        'https://releases.toolhive.dev/stable/latest/darwin/arm64/RELEASES.json'
      )
    })

    it('returns S3 RELEASES.json for macOS pre-release', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      Object.defineProperty(process, 'arch', { value: 'x64' })

      expect(getManifestUrl('1.0.0-beta.1')).toBe(
        'https://releases.toolhive.dev/pre-release/latest/darwin/x64/RELEASES.json'
      )
    })

    it('returns S3 Squirrel RELEASES for Windows stable', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      Object.defineProperty(process, 'arch', { value: 'x64' })

      expect(getManifestUrl('1.0.0')).toBe(
        'https://releases.toolhive.dev/stable/latest/win32/x64/RELEASES'
      )
    })

    it('returns S3 Squirrel RELEASES for Windows pre-release', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      Object.defineProperty(process, 'arch', { value: 'x64' })

      expect(getManifestUrl('0.22.1-rc.0')).toBe(
        'https://releases.toolhive.dev/pre-release/latest/win32/x64/RELEASES'
      )
    })

    it('returns GitHub Pages manifest for Linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })

      expect(getManifestUrl('1.0.0')).toBe(
        'https://stacklok.github.io/toolhive-studio/latest/index.json'
      )
    })

    it('returns GitHub Pages manifest for Linux even for pre-release', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })

      expect(getManifestUrl('1.0.0-alpha.1')).toBe(
        'https://stacklok.github.io/toolhive-studio/latest/index.json'
      )
    })
  })

  describe('parseVersionFromSquirrelReleases', () => {
    it('parses stable version from RELEASES content', () => {
      const content =
        '91337D0AC79110434C1ABA4B332974C76655D793 ToolHive-0.24.0-full.nupkg 183478042'
      expect(parseVersionFromSquirrelReleases(content)).toBe('0.24.0')
    })

    it('parses pre-release version from RELEASES content', () => {
      const content = 'AABBCCDD ToolHive-1.5.0-rc.1-full.nupkg 183478042'
      expect(parseVersionFromSquirrelReleases(content)).toBe('1.5.0-rc.1')
    })

    it('picks version from multi-line RELEASES (last full entry)', () => {
      const content = [
        'AAAA ToolHive-0.23.0-full.nupkg 183390001',
        'BBBB ToolHive-0.24.0-delta.nupkg 12391027',
        'CCCC ToolHive-0.24.0-full.nupkg 183478042',
      ].join('\n')
      expect(parseVersionFromSquirrelReleases(content)).toBe('0.23.0')
    })

    it('returns undefined for empty content', () => {
      expect(parseVersionFromSquirrelReleases('')).toBeUndefined()
    })

    it('returns undefined for malformed content', () => {
      expect(parseVersionFromSquirrelReleases('no nupkg here')).toBeUndefined()
    })
  })

  describe('fetchLatestRelease', () => {
    const mockSpan = {
      setStatus: vi.fn(),
      setAttribute: vi.fn(),
    }

    it('fetches and parses RELEASES.json on macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ currentRelease: '1.5.0' }),
      })

      const result = await fetchLatestRelease(mockSpan as never)

      expect(result).toEqual({
        currentVersion: '1.0.0',
        latestVersion: '1.5.0',
        isNewVersionAvailable: true,
      })
    })

    it('fetches and parses Squirrel RELEASES on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          '91337D0AC79110434C1ABA4B332974C76655D793 ToolHive-1.5.0-full.nupkg 183478042',
      })

      const result = await fetchLatestRelease(mockSpan as never)

      expect(result).toEqual({
        currentVersion: '1.0.0',
        latestVersion: '1.5.0',
        isNewVersionAvailable: true,
      })
    })

    it('fetches and parses GitHub Pages manifest on Linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tag: 'v1.5.0' }),
      })

      const result = await fetchLatestRelease(mockSpan as never)

      expect(result).toEqual({
        currentVersion: '1.0.0',
        latestVersion: 'v1.5.0',
        isNewVersionAvailable: true,
      })
    })

    it('returns no update when version matches current', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ currentRelease: '1.0.0' }),
      })

      const result = await fetchLatestRelease(mockSpan as never)

      expect(result).toEqual({
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        isNewVersionAvailable: false,
      })
    })

    it('handles non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      })

      const result = await fetchLatestRelease(mockSpan as never)

      expect(result).toEqual({
        currentVersion: '1.0.0',
        latestVersion: undefined,
        isNewVersionAvailable: false,
      })
      expect(vi.mocked(log).error).toHaveBeenCalledWith(
        '[update] Failed to check for ToolHive update from: ',
        expect.any(String)
      )
    })
  })
})
