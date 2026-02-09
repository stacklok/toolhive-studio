import { describe, it, expect, vi } from 'vitest'

vi.mock('../../logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { parseDeepLinkUrl } from '../parse'

describe('parseDeepLinkUrl', () => {
  it('parses a valid open-registry-server-detail URL', () => {
    const result = parseDeepLinkUrl(
      'toolhive-gui://v1/open-registry-server-detail?serverName=time'
    )
    expect(result).toEqual({
      ok: true,
      intent: {
        version: 'v1',
        action: 'open-registry-server-detail',
        params: { serverName: 'time' },
      },
    })
  })

  it('accepts server names with dots, dashes, and underscores', () => {
    const result = parseDeepLinkUrl(
      'toolhive-gui://v1/open-registry-server-detail?serverName=my-server_v1.2'
    )
    expect(result).toEqual({
      ok: true,
      intent: {
        version: 'v1',
        action: 'open-registry-server-detail',
        params: { serverName: 'my-server_v1.2' },
      },
    })
  })

  it('rejects wrong protocol', () => {
    const result = parseDeepLinkUrl(
      'https://v1/open-registry-server-detail?serverName=time'
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('protocol')
    }
  })

  it('rejects unsupported version', () => {
    const result = parseDeepLinkUrl(
      'toolhive-gui://v2/open-registry-server-detail?serverName=time'
    )
    expect(result.ok).toBe(false)
  })

  it('rejects unknown action', () => {
    const result = parseDeepLinkUrl(
      'toolhive-gui://v1/unknown-action?serverName=time'
    )
    expect(result.ok).toBe(false)
  })

  it('rejects missing serverName param', () => {
    const result = parseDeepLinkUrl(
      'toolhive-gui://v1/open-registry-server-detail'
    )
    expect(result.ok).toBe(false)
  })

  it('rejects empty serverName param', () => {
    const result = parseDeepLinkUrl(
      'toolhive-gui://v1/open-registry-server-detail?serverName='
    )
    expect(result.ok).toBe(false)
  })

  it('rejects special characters in serverName', () => {
    const result = parseDeepLinkUrl(
      'toolhive-gui://v1/open-registry-server-detail?serverName=../../etc/passwd'
    )
    expect(result.ok).toBe(false)
  })

  it('rejects serverName with spaces', () => {
    const result = parseDeepLinkUrl(
      'toolhive-gui://v1/open-registry-server-detail?serverName=my%20server'
    )
    expect(result.ok).toBe(false)
  })

  it('handles totally invalid URL string', () => {
    const result = parseDeepLinkUrl('not-a-url')
    expect(result.ok).toBe(false)
  })

  it('handles empty string', () => {
    const result = parseDeepLinkUrl('')
    expect(result.ok).toBe(false)
  })

  it('ignores extra query parameters', () => {
    const result = parseDeepLinkUrl(
      'toolhive-gui://v1/open-registry-server-detail?serverName=time&extra=ignored'
    )
    // Zod strips unknown keys by default, so this should still parse
    expect(result.ok).toBe(true)
  })
})
