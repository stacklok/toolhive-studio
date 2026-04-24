import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { platform } from 'node:os'

import { createEnhancedPath } from '../enhanced-path'

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>()
  const platformMock = vi.fn(actual.platform)
  return {
    ...actual,
    platform: platformMock,
    default: {
      ...actual,
      platform: platformMock,
    },
  }
})

const mockPlatform = vi.mocked(platform)

describe('createEnhancedPath', () => {
  beforeEach(() => {
    mockPlatform.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prepends macOS container-tooling paths on darwin', () => {
    mockPlatform.mockReturnValue('darwin')
    vi.stubEnv('PATH', '/usr/bin:/bin')
    vi.stubEnv('HOME', '/Users/test')

    const result = createEnhancedPath()
    const entries = result.split(':')

    expect(entries.slice(0, 4)).toEqual([
      '/Applications/Docker.app/Contents/Resources/bin',
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/Users/test/.rd/bin',
    ])
    expect(entries).toContain('/usr/bin')
    expect(entries).toContain('/bin')
  })

  it('expands ~ using HOME', () => {
    mockPlatform.mockReturnValue('darwin')
    vi.stubEnv('PATH', '')
    vi.stubEnv('HOME', '/Users/alice')

    const result = createEnhancedPath()

    expect(result).toContain('/Users/alice/.rd/bin')
    expect(result).not.toContain('~')
  })

  it('keeps ~ verbatim when HOME and USERPROFILE are both unset', () => {
    mockPlatform.mockReturnValue('darwin')
    vi.stubEnv('PATH', '')
    vi.stubEnv('HOME', '')
    vi.stubEnv('USERPROFILE', '')

    const result = createEnhancedPath()
    const entries = result.split(':')

    expect(entries).toContain('~/.rd/bin')
    expect(entries).not.toContain('/.rd/bin')
  })

  it('uses semicolon as separator on win32', () => {
    mockPlatform.mockReturnValue('win32')
    vi.stubEnv('PATH', 'C:\\Windows\\System32;C:\\Windows')

    const result = createEnhancedPath()
    const entries = result.split(';')

    expect(entries[0]).toBe('C:\\Program Files\\Docker\\Docker\\resources\\bin')
    expect(entries[1]).toBe('C:\\Program Files\\RedHat\\Podman')
    expect(entries).toContain('C:\\Windows\\System32')
    expect(entries).toContain('C:\\Windows')
  })

  it('prepends linux container-tooling paths', () => {
    mockPlatform.mockReturnValue('linux')
    vi.stubEnv('PATH', '/usr/bin:/bin')
    vi.stubEnv('HOME', '/home/test')

    const result = createEnhancedPath()
    const entries = result.split(':')

    expect(entries.slice(0, 4)).toEqual([
      '/usr/local/bin',
      '/opt/homebrew/bin',
      '/snap/bin',
      '/home/test/.rd/bin',
    ])
  })

  it('preserves existing PATH entries after the prepended paths', () => {
    mockPlatform.mockReturnValue('darwin')
    vi.stubEnv('PATH', '/existing/bin:/another/bin')
    vi.stubEnv('HOME', '/Users/test')

    const result = createEnhancedPath()
    const entries = result.split(':')

    const existingIndex = entries.indexOf('/existing/bin')
    const anotherIndex = entries.indexOf('/another/bin')

    expect(existingIndex).toBeGreaterThan(-1)
    expect(anotherIndex).toBeGreaterThan(existingIndex)
  })

  it('handles empty PATH gracefully', () => {
    mockPlatform.mockReturnValue('darwin')
    vi.stubEnv('PATH', '')
    vi.stubEnv('HOME', '/Users/test')

    const result = createEnhancedPath()

    expect(result).not.toBe('')
    expect(result).toContain('/usr/local/bin')
    // No trailing empty segments from the split/join
    expect(result.endsWith(':')).toBe(false)
  })
})
