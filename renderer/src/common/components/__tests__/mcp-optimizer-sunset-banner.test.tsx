import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { McpOptimizerSunsetBanner } from '../mcp-optimizer-sunset-banner'
import { MCP_OPTIMIZER_SUNSET_BLOG_URL } from '@common/app-info'

const mockUseMcpOptimizerBannerVisible = vi.fn()
vi.mock('@/common/hooks/use-mcp-optimizer-banner-visible', () => ({
  useMcpOptimizerBannerVisible: () => mockUseMcpOptimizerBannerVisible(),
}))

describe('McpOptimizerSunsetBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('renders the banner when visible', () => {
      mockUseMcpOptimizerBannerVisible.mockReturnValue(true)

      render(<McpOptimizerSunsetBanner />)

      expect(
        screen.getByText(/MCP Optimizer is leaving the desktop app/)
      ).toBeVisible()
    })

    it('does not render when not visible', () => {
      mockUseMcpOptimizerBannerVisible.mockReturnValue(false)

      render(<McpOptimizerSunsetBanner />)

      expect(
        screen.queryByText(/MCP Optimizer is leaving the desktop app/)
      ).not.toBeInTheDocument()
    })
  })

  describe('link', () => {
    it('renders a descriptive link to the blog post', () => {
      mockUseMcpOptimizerBannerVisible.mockReturnValue(true)

      render(<McpOptimizerSunsetBanner />)

      const link = screen.getByRole('link', { name: /Learn about its future/ })
      expect(link).toBeVisible()
      expect(link).toHaveAttribute(
        'href',
        expect.stringContaining(MCP_OPTIMIZER_SUNSET_BLOG_URL)
      )
    })

    it('opens the link in a new tab with safe rel attributes', () => {
      mockUseMcpOptimizerBannerVisible.mockReturnValue(true)

      render(<McpOptimizerSunsetBanner />)

      const link = screen.getByRole('link', { name: /Learn about its future/ })
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })
})
