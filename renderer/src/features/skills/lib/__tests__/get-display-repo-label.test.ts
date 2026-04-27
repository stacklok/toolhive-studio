import { expect, it, describe } from 'vitest'
import { getDisplayRepoLabel } from '../get-display-repo-label'

describe('getDisplayRepoLabel', () => {
  it('returns org/repo for a plain GitHub URL', () => {
    expect(getDisplayRepoLabel('https://github.com/stacklok/skills')).toBe(
      'stacklok/skills'
    )
  })

  it('strips a trailing .git suffix from GitHub URLs', () => {
    expect(getDisplayRepoLabel('https://github.com/stacklok/skills.git')).toBe(
      'stacklok/skills'
    )
  })

  it('strips www. and trailing slashes from GitHub URLs', () => {
    expect(getDisplayRepoLabel('https://www.github.com/stacklok/skills/')).toBe(
      'stacklok/skills'
    )
  })

  it('ignores any extra path segments on GitHub URLs', () => {
    expect(
      getDisplayRepoLabel('https://github.com/stacklok/skills/tree/main')
    ).toBe('stacklok/skills')
  })

  it('returns host/path for non-GitHub hosts', () => {
    expect(getDisplayRepoLabel('https://gitlab.com/group/sub/repo')).toBe(
      'gitlab.com/group/sub/repo'
    )
  })

  it('strips .git and trailing slashes for non-GitHub hosts', () => {
    expect(getDisplayRepoLabel('https://gitlab.com/group/repo.git/')).toBe(
      'gitlab.com/group/repo'
    )
  })

  it('returns null for undefined', () => {
    expect(getDisplayRepoLabel(undefined)).toBeNull()
  })

  it('returns null for null', () => {
    expect(getDisplayRepoLabel(null)).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(getDisplayRepoLabel('')).toBeNull()
  })

  it('returns null for an unparseable URL', () => {
    expect(getDisplayRepoLabel('not a url')).toBeNull()
  })

  it('returns null when GitHub URL has no repo segment', () => {
    expect(getDisplayRepoLabel('https://github.com/stacklok')).toBeNull()
  })

  it('returns null when there is no path at all', () => {
    expect(getDisplayRepoLabel('https://github.com')).toBeNull()
  })
})
