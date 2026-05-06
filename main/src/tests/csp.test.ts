import { describe, it, expect } from 'vitest'
import { getCspString } from '../csp'

function parseCsp(csp: string): Record<string, string> {
  return Object.fromEntries(
    csp
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf(' ')
        if (idx === -1) return [part, '']
        return [part.slice(0, idx), part.slice(idx + 1)] as const
      })
  )
}

describe('getCspString', () => {
  it('omits localhost from connect-src (transport is now over IPC, not HTTP)', () => {
    const csp = getCspString()

    expect(csp).not.toMatch(/localhost/)
    expect(csp).not.toMatch(/127\.0\.0\.1/)
  })

  it('without a Sentry DSN, connect-src is just self + hsforms', () => {
    const map = parseCsp(getCspString())

    expect(map['connect-src']).toBe("'self' https://api.hsforms.com")
    expect(map['connect-src']).not.toContain('sentry.io')
  })

  it('with a Sentry DSN, connect-src additionally allows *.sentry.io and worker-src allows blob:', () => {
    const map = parseCsp(getCspString('https://sentry.example/dsn'))

    expect(map['connect-src']).toBe(
      "'self' https://api.hsforms.com https://*.sentry.io"
    )
    expect(map['worker-src']).toBe("'self' blob:")
  })

  it("without a Sentry DSN, worker-src is 'self' only", () => {
    const map = parseCsp(getCspString())

    expect(map['worker-src']).toBe("'self'")
  })

  it("always emits frame-src 'none', object-src 'none', and frame-ancestors 'none'", () => {
    const map = parseCsp(getCspString())

    expect(map['frame-src']).toBe("'none'")
    expect(map['object-src']).toBe("'none'")
    expect(map['frame-ancestors']).toBe("'none'")
  })

  it('emits a `; `-joined string that round-trips through the parser', () => {
    const csp = getCspString()
    expect(csp).toContain('; ')

    const map = parseCsp(csp)

    expect(map).toMatchObject({
      'default-src': "'self'",
      'script-src': "'self'",
      'style-src': "'self' 'unsafe-inline'",
      'img-src': "'self' data: blob:",
      'font-src': "'self' data:",
      'base-uri': "'self'",
      'form-action': "'self'",
      'manifest-src': "'self'",
      'media-src': "'self' blob: data:",
      'child-src': "'self' blob:",
    })
  })
})
