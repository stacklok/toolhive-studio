import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isOfficialReleaseBuild, getAppVersion } from '../util'

vi.mock('../util', async () => {
  const actual = await vi.importActual('../util')
  return {
    ...actual,
    getAppVersion: vi.fn(),
  }
})

const mockGetAppVersion = vi.mocked(getAppVersion)

describe('isOfficialRelease', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return false for development version 0.0.1-dev', () => {
    mockGetAppVersion.mockReturnValue('0.0.1-dev')
    expect(isOfficialReleaseBuild()).toBe(false)
  })

  it('should return true for official release version 23.3.4', () => {
    mockGetAppVersion.mockReturnValue('23.3.4')
    expect(isOfficialReleaseBuild()).toBe(true)
  })

  it('should return false for alpha version 0.0.5-alpha', () => {
    mockGetAppVersion.mockReturnValue('0.0.5-alpha')
    expect(isOfficialReleaseBuild()).toBe(false)
  })
})
