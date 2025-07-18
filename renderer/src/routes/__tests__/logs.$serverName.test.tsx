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
    vi.spyOn(console, 'error').mockImplementation(() => {})
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

      expect(screen.queryAllByRole('mark', { name: /database/i })).toHaveLength(
        2
      )
      expect(screen.getByText(/connection established/i)).toBeVisible()
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

  // New tests for edge cases and missing coverage

  describe('Search functionality edge cases', () => {
    it('handles case-insensitive search', async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({
        to: '/logs/$serverName',
        params: { serverName: 'postgres-db' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'postgres-db' })
        ).toBeVisible()
      })

      const search = screen.getByPlaceholderText('Search log')
      await userEvent.type(search, 'DATABASE')

      // Should still find "database" in logs (case insensitive)
      expect(screen.queryAllByRole('mark', { name: /database/i })).toHaveLength(
        2
      )
    })

    it('handles search with special characters', async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({
        to: '/logs/$serverName',
        params: { serverName: 'postgres-db' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'postgres-db' })
        ).toBeVisible()
      })

      const search = screen.getByPlaceholderText('Search log')
      await userEvent.type(search, 'INFO:')

      // Should find log entries with "INFO:" prefix
      expect(screen.queryAllByRole('mark', { name: /INFO:/i })).toHaveLength(10)
    })

    it('shows "No logs match your search" when search has no results', async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({
        to: '/logs/$serverName',
        params: { serverName: 'postgres-db' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'postgres-db' })
        ).toBeVisible()
      })

      const search = screen.getByPlaceholderText('Search log')
      await userEvent.type(search, 'nonexistentlogentry')

      expect(screen.getByText('No logs match your search')).toBeVisible()
    })

    it('handles empty search input', async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({
        to: '/logs/$serverName',
        params: { serverName: 'postgres-db' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'postgres-db' })
        ).toBeVisible()
      })

      const search = screen.getByPlaceholderText('Search log')
      await userEvent.type(search, 'database')
      await userEvent.clear(search)

      // Should show all logs when search is cleared
      expect(screen.getByText(/server .* started successfully/i)).toBeVisible()
      expect(screen.getByText(/connection established/i)).toBeVisible()
    })
  })

  describe('Log formatting edge cases', () => {
    it('handles very long log lines', async () => {
      const longLogLine = 'A'.repeat(1000)
      getMockLogs.mockReturnValueOnce(longLogLine)

      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({
        to: '/logs/$serverName',
        params: { serverName: 'postgres-db' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'postgres-db' })
        ).toBeVisible()
      })

      expect(screen.getByText(longLogLine)).toBeVisible()
    })

    it('handles logs with HTML-like content', async () => {
      const htmlLikeLog = '<script>alert("test")</script> <div>content</div>'
      getMockLogs.mockReturnValueOnce(htmlLikeLog)

      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({
        to: '/logs/$serverName',
        params: { serverName: 'postgres-db' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'postgres-db' })
        ).toBeVisible()
      })

      // Should display the content as text, not render as HTML
      expect(screen.getByText(htmlLikeLog)).toBeVisible()
    })

    it('handles logs with special characters', async () => {
      const specialCharsLog =
        'Log with special chars: éñüß@#$%^&*()_+-=[]{}|;:,.<>?'
      getMockLogs.mockReturnValueOnce(specialCharsLog)

      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({
        to: '/logs/$serverName',
        params: { serverName: 'postgres-db' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'postgres-db' })
        ).toBeVisible()
      })

      expect(screen.getByText(specialCharsLog)).toBeVisible()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for search and refresh buttons', async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({
        to: '/logs/$serverName',
        params: { serverName: 'postgres-db' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'postgres-db' })
        ).toBeVisible()
      })

      // Check that search input is accessible
      const searchInput = screen.getByPlaceholderText('Search log')
      expect(searchInput).toBeVisible()

      const refreshButton = screen.getByRole('button', { name: 'Refresh' })
      expect(refreshButton).toBeVisible()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({
        to: '/logs/$serverName',
        params: { serverName: 'postgres-db' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'postgres-db' })
        ).toBeVisible()
      })

      const searchInput = screen.getByPlaceholderText('Search log')
      await user.click(searchInput)
      await user.keyboard('database')

      expect(screen.queryAllByRole('mark', { name: /database/i })).toHaveLength(
        2
      )
    })
  })
})
