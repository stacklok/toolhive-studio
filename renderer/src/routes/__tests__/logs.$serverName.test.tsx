import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogsPage } from '@/features/mcp-servers/sub-pages/logs-page'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import userEvent from '@testing-library/user-event'
import { getMockLogs } from '@/common/mocks/fixtures/servers'

describe('Logs Route', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  const testCases = [
    { serverName: 'postgres-db', description: 'simple server name' },
    {
      serverName: 'vscode-server',
      description: 'server name with hyphens',
    },
    { serverName: 'github', description: 'server name with numbers' },
  ]

  testCases.forEach(({ serverName, description }) => {
    it(`displays server name as header for ${description}`, async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({ to: '/logs/$serverName', params: { serverName } })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
      })
    })

    it(`has a back button that navigates to root route for ${description}`, async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({ to: '/logs/$serverName', params: { serverName } })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
      })

      const backButton = screen.getByRole('button', { name: /back/i })
      expect(backButton).toBeVisible()
      expect(backButton.closest('a')).toHaveAttribute('href', '/')

      await userEvent.click(backButton)

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/')
      })
    })

    it(`filters logs when searching for ${description}`, async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({ to: '/logs/$serverName', params: { serverName } })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
      })

      expect(
        screen.queryByText(/server .* started successfully/i)
      ).toBeVisible()

      const search = screen.getByPlaceholderText('Search log')
      await userEvent.type(search, 'database')

      expect(screen.getByText(/database connection established/i)).toBeVisible()
      expect(
        screen.queryByText(/server .* started successfully/i)
      ).not.toBeInTheDocument()

      await userEvent.clear(search)

      expect(
        screen.queryByText(/server .* started successfully/i)
      ).toBeVisible()
    })
  })

  it('handles empty logs response gracefully', async () => {
    const serverName = 'empty-logs-server'
    const router = createTestRouter(LogsPage, '/logs/$serverName')
    router.navigate({ to: '/logs/$serverName', params: { serverName } })
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
    })

    expect(screen.getByText('No logs available')).toBeVisible()
  })

  it('refreshes logs when refresh button is clicked', async () => {
    const serverName = 'postgres-db'
    const router = createTestRouter(LogsPage, '/logs/$serverName')
    router.navigate({ to: '/logs/$serverName', params: { serverName } })
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
    })

    expect(screen.queryByText(/.*new log entry.*/i)).not.toBeInTheDocument()

    getMockLogs.mockReturnValueOnce(
      '[2025-06-09 15:30:00] INFO: New log entry that just appeared'
    )

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    expect(refreshButton).toBeVisible()
    await userEvent.click(refreshButton)

    await waitFor(() => {
      expect(screen.getByText(/.*new log entry.*/i)).toBeVisible()
    })
  })
})
