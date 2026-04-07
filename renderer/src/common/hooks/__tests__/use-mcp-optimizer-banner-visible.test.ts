import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockUseMatches = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useMatches: () => mockUseMatches(),
}))

vi.mock('../use-feature-flag')

const { useFeatureFlag } = await import('../use-feature-flag')
const { useMcpOptimizerBannerVisible } =
  await import('../use-mcp-optimizer-banner-visible')

describe('useMcpOptimizerBannerVisible', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when feature flag is enabled', () => {
    beforeEach(() => {
      vi.mocked(useFeatureFlag).mockReturnValue(true)
    })

    it('returns true on the /group/$groupName route', () => {
      mockUseMatches.mockReturnValue([{ routeId: '/group/$groupName' }])

      const { result } = renderHook(() => useMcpOptimizerBannerVisible())

      expect(result.current).toBe(true)
    })

    it('returns true on the /mcp-optimizer route', () => {
      mockUseMatches.mockReturnValue([{ routeId: '/mcp-optimizer' }])

      const { result } = renderHook(() => useMcpOptimizerBannerVisible())

      expect(result.current).toBe(true)
    })

    it('returns false on a non-banner route', () => {
      mockUseMatches.mockReturnValue([{ routeId: '/settings' }])

      const { result } = renderHook(() => useMcpOptimizerBannerVisible())

      expect(result.current).toBe(false)
    })

    it('returns false when no routes match', () => {
      mockUseMatches.mockReturnValue([])

      const { result } = renderHook(() => useMcpOptimizerBannerVisible())

      expect(result.current).toBe(false)
    })
  })

  describe('when feature flag is disabled', () => {
    beforeEach(() => {
      vi.mocked(useFeatureFlag).mockReturnValue(false)
    })

    it('returns false even on a banner route', () => {
      mockUseMatches.mockReturnValue([{ routeId: '/group/$groupName' }])

      const { result } = renderHook(() => useMcpOptimizerBannerVisible())

      expect(result.current).toBe(false)
    })

    it('returns false on the /mcp-optimizer route', () => {
      mockUseMatches.mockReturnValue([{ routeId: '/mcp-optimizer' }])

      const { result } = renderHook(() => useMcpOptimizerBannerVisible())

      expect(result.current).toBe(false)
    })
  })
})
