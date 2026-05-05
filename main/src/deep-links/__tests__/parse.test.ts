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
      deepLink: {
        version: 'v1',
        intent: 'open-registry-server-detail',
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
      deepLink: {
        version: 'v1',
        intent: 'open-registry-server-detail',
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

  it('rejects unknown intent', () => {
    const result = parseDeepLinkUrl(
      'toolhive-gui://v1/unknown-intent?serverName=time'
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

  describe('open-registry-skill-detail', () => {
    it('parses a valid URL', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-detail?namespace=stacklok&skillName=skill-creator'
      )
      expect(result).toEqual({
        ok: true,
        deepLink: {
          version: 'v1',
          intent: 'open-registry-skill-detail',
          params: { namespace: 'stacklok', skillName: 'skill-creator' },
        },
      })
    })

    it('accepts dotted namespaces (e.g. io.github.stacklok)', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-detail?namespace=io.github.stacklok&skillName=skill-creator'
      )
      expect(result.ok).toBe(true)
    })

    it('rejects missing namespace', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-detail?skillName=skill-creator'
      )
      expect(result.ok).toBe(false)
    })

    it('rejects missing skillName', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-detail?namespace=stacklok'
      )
      expect(result.ok).toBe(false)
    })

    it('rejects path-traversal in namespace', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-detail?namespace=../../etc&skillName=passwd'
      )
      expect(result.ok).toBe(false)
    })

    it('rejects spaces in skillName', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-detail?namespace=stacklok&skillName=my%20skill'
      )
      expect(result.ok).toBe(false)
    })
  })

  describe('open-registry-skill-install', () => {
    it('parses a valid URL without version', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-install?namespace=stacklok&skillName=skill-creator'
      )
      expect(result).toEqual({
        ok: true,
        deepLink: {
          version: 'v1',
          intent: 'open-registry-skill-install',
          params: { namespace: 'stacklok', skillName: 'skill-creator' },
        },
      })
    })

    it('parses a valid URL with version=v1.2.3', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-install?namespace=stacklok&skillName=skill-creator&version=v1.2.3'
      )
      expect(result).toEqual({
        ok: true,
        deepLink: {
          version: 'v1',
          intent: 'open-registry-skill-install',
          params: {
            namespace: 'stacklok',
            skillName: 'skill-creator',
            version: 'v1.2.3',
          },
        },
      })
    })

    it('accepts pre-release tags like 1.2.3-rc.1', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-install?namespace=stacklok&skillName=skill-creator&version=1.2.3-rc.1'
      )
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(
          'version' in result.deepLink.params
            ? result.deepLink.params.version
            : undefined
        ).toBe('1.2.3-rc.1')
      }
    })

    it('rejects digest-style version (sha256:...) — colons not supported', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-install?namespace=stacklok&skillName=skill-creator&version=sha256:abc123'
      )
      expect(result.ok).toBe(false)
    })

    it('rejects spaces in version', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-install?namespace=stacklok&skillName=skill-creator&version=v1%200'
      )
      expect(result.ok).toBe(false)
    })

    it('rejects missing namespace', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-install?skillName=skill-creator'
      )
      expect(result.ok).toBe(false)
    })

    it('rejects missing skillName', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-install?namespace=stacklok'
      )
      expect(result.ok).toBe(false)
    })

    it('ignores extra query parameters', () => {
      const result = parseDeepLinkUrl(
        'toolhive-gui://v1/open-registry-skill-install?namespace=stacklok&skillName=skill-creator&extra=ignored'
      )
      expect(result.ok).toBe(true)
    })
  })
})
