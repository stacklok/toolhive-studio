import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TopNav } from '..'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'

vi.mock('../window-controls', () => ({
  WindowControls: () => null,
}))

vi.mock('@/common/lib/os-design', () => ({
  getOsDesignVariant: () => 'mac',
}))

describe('TopNav', () => {
  beforeEach(() => {
    window.electronAPI.onUpdateDownloaded = vi.fn(() => () => {})
  })

  function renderTopNav(props: { isEnterprise?: boolean } = {}) {
    const router = createTestRouter(() => <TopNav {...props} />)
    return renderRoute(router)
  }

  it('renders MCP Servers navigation link', async () => {
    renderTopNav()
    await waitFor(() => {
      expect(screen.getByText('MCP Servers')).toBeInTheDocument()
    })
  })

  it('renders Registry navigation link', async () => {
    renderTopNav()
    await waitFor(() => {
      expect(screen.getByText('Registry')).toBeInTheDocument()
    })
  })

  it('renders Playground navigation link', async () => {
    renderTopNav()
    await waitFor(() => {
      expect(screen.getByText('Playground')).toBeInTheDocument()
    })
  })

  it('renders Settings button', async () => {
    renderTopNav()
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /settings/i })
      ).toBeInTheDocument()
    })
  })

  describe('Upgrade to Enterprise button', () => {
    it('renders with correct text', async () => {
      renderTopNav()
      await waitFor(() => {
        expect(screen.getByText('Upgrade to Enterprise')).toBeInTheDocument()
      })
    })

    it('links to the enterprise page', async () => {
      renderTopNav()
      await waitFor(() => {
        const link = screen.getByRole('link', {
          name: /upgrade to enterprise/i,
        })
        expect(link).toHaveAttribute(
          'href',
          'https://docs.stacklok.com/toolhive/enterprise?utm_source=toolhive-studio'
        )
      })
    })

    it('opens in a new tab', async () => {
      renderTopNav()
      await waitFor(() => {
        const link = screen.getByRole('link', {
          name: /upgrade to enterprise/i,
        })
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      })
    })

    it('is hidden when isEnterprise is true', async () => {
      renderTopNav({ isEnterprise: true })
      await waitFor(() => {
        expect(screen.getByText('MCP Servers')).toBeInTheDocument()
      })
      expect(
        screen.queryByText('Upgrade to Enterprise')
      ).not.toBeInTheDocument()
    })

    it('is visible by default (isEnterprise not set)', async () => {
      renderTopNav()
      await waitFor(() => {
        expect(screen.getByText('Upgrade to Enterprise')).toBeInTheDocument()
      })
    })
  })
})
