import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let warnSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  warnSpy.mockRestore()
})

const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }))

vi.mock('node:fs/promises', () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}))

vi.mock('../../logger', () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { loadBrandingConfig, getBrandingCss } from '../load'

const FAKE_PATH = '/fake/branding.json'

function enoent(): NodeJS.ErrnoException {
  const err = new Error('ENOENT: no such file') as NodeJS.ErrnoException
  err.code = 'ENOENT'
  return err
}

describe('loadBrandingConfig', () => {
  beforeEach(() => {
    mockReadFile.mockReset()
  })

  it('returns null when the file does not exist (ENOENT)', async () => {
    mockReadFile.mockRejectedValueOnce(enoent())
    await expect(loadBrandingConfig(FAKE_PATH)).resolves.toBeNull()
  })

  it('returns null on other read errors', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('EACCES'))
    await expect(loadBrandingConfig(FAKE_PATH)).resolves.toBeNull()
  })

  it('returns null when content is not valid JSON', async () => {
    mockReadFile.mockResolvedValueOnce('{ not json ')
    await expect(loadBrandingConfig(FAKE_PATH)).resolves.toBeNull()
  })

  it('returns null when content is not an object', async () => {
    mockReadFile.mockResolvedValueOnce('["array", "instead"]')
    await expect(loadBrandingConfig(FAKE_PATH)).resolves.toBeNull()
  })

  it('returns the parsed config for a minimal valid file', async () => {
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({
        design_tokens: { colors: { light: { primary: '#ff6600' } } },
      })
    )
    const cfg = await loadBrandingConfig(FAKE_PATH)
    expect(cfg).toEqual({
      design_tokens: { colors: { light: { primary: '#ff6600' } } },
    })
  })

  it('passes through forward-compat non-color fields without consuming them', async () => {
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({
        app_name: 'Acme',
        logo_url: 'https://cdn.example.com/logo.svg',
        design_tokens: { colors: { light: { primary: '#abc' } } },
      })
    )
    const cfg = await loadBrandingConfig(FAKE_PATH)
    expect(cfg?.app_name).toBe('Acme')
    expect(cfg?.logo_url).toBe('https://cdn.example.com/logo.svg')
  })

  it('returns null when shape is fundamentally wrong (colors not an object)', async () => {
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({ design_tokens: { colors: 'oops' } })
    )
    await expect(loadBrandingConfig(FAKE_PATH)).resolves.toBeNull()
  })
})

describe('getBrandingCss', () => {
  beforeEach(() => {
    mockReadFile.mockReset()
  })

  it('returns empty string when there is no config file', async () => {
    mockReadFile.mockRejectedValueOnce(enoent())
    await expect(getBrandingCss(FAKE_PATH)).resolves.toBe('')
  })

  it('returns empty string when the config has no color overrides', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify({ app_name: 'Acme' }))
    await expect(getBrandingCss(FAKE_PATH)).resolves.toBe('')
  })

  it('serializes light + dark overrides into the cloud-ui selector shape', async () => {
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({
        design_tokens: {
          colors: {
            light: { 'nav-background': '#c2185b' },
            dark: { 'nav-background': '#4a0d33' },
          },
        },
      })
    )
    await expect(getBrandingCss(FAKE_PATH)).resolves.toBe(
      ':root:not(.dark) { --nav-background: #c2185b; } ' +
        '.dark { --nav-background: #4a0d33; }'
    )
  })

  it('drops unknown token keys with a warn-log', async () => {
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({
        design_tokens: {
          colors: {
            light: { primary: '#abc', 'not-a-real-token': '#fff' },
          },
        },
      })
    )
    await expect(getBrandingCss(FAKE_PATH)).resolves.toBe(
      ':root:not(.dark) { --primary: #abc; }'
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('unknown token "not-a-real-token"')
    )
  })

  it('drops values that fail sanitization with a warn-log', async () => {
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({
        design_tokens: {
          colors: { light: { primary: '#abc; background: url(x)' } },
        },
      })
    )
    await expect(getBrandingCss(FAKE_PATH)).resolves.toBe('')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('unsafe value for "primary"')
    )
  })
})
