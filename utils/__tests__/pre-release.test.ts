import { describe, expect, it } from 'vitest'
import { isPrerelease } from '../pre-release'

describe('isPrerelease', () => {
  it('returns true for prerelease tag refs', () => {
    expect(isPrerelease('refs/tags/v1.2.3-alpha')).toBe(true)
    expect(isPrerelease('refs/tags/1.2.3-beta.1')).toBe(true)
    expect(isPrerelease('refs/tags/v10.20.30-rc.2')).toBe(true)
  })

  it('returns false for stable tag refs', () => {
    expect(isPrerelease('refs/tags/v1.2.3')).toBe(false)
    expect(isPrerelease('refs/tags/1.2.3')).toBe(false)
  })

  it('returns false for non-tag refs', () => {
    expect(isPrerelease('refs/heads/main')).toBe(false)
    expect(isPrerelease('refs/pull/123/merge')).toBe(false)
    expect(isPrerelease('')).toBe(false)
  })

  it('falls back to GITHUB_REF when no arg', () => {
    const previous = process.env.GITHUB_REF
    process.env.GITHUB_REF = 'refs/tags/v2.0.0-beta.1'
    expect(isPrerelease()).toBe(true)
    process.env.GITHUB_REF = previous
  })
})
