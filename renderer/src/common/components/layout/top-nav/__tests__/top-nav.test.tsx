import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TopNav } from '..'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import type { Permissions } from '@/common/contexts/permissions'
import { PERMISSION_KEYS } from '@/common/contexts/permissions/permission-keys'
import { APP_IDENTIFIER, DOCS_BASE_URL } from '@common/app-info'

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

  function renderTopNavWithPermissions(
    permissions: Partial<Permissions>,
    props: { isEnterprise?: boolean } = {}
  ) {
    const router = createTestRouter(() => <TopNav {...props} />)
    return renderRoute(router, { permissions })
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

  it('hides Playground when PLAYGROUND_MENU permission is disabled', async () => {
    renderTopNavWithPermissions({
      [PERMISSION_KEYS.PLAYGROUND_MENU]: false,
    })
    await waitFor(() => {
      expect(screen.getByText('MCP Servers')).toBeInTheDocument()
    })
    expect(screen.queryByText('Playground')).not.toBeInTheDocument()
  })

  it('renders Help button when HELP_MENU permission is enabled', async () => {
    renderTopNav()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument()
    })
  })

  it('hides Help button when HELP_MENU permission is disabled', async () => {
    renderTopNavWithPermissions({
      [PERMISSION_KEYS.HELP_MENU]: false,
    })
    await waitFor(() => {
      expect(screen.getByText('MCP Servers')).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('button', { name: /help/i })
    ).not.toBeInTheDocument()
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
          `${DOCS_BASE_URL}/enterprise?utm_source=${APP_IDENTIFIER}&utm_medium=app&utm_campaign=enterprise-upgrade&utm_content=app-header&tdi=test-instance-id`
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
