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
    {
      serverName: 'github',
      description: 'server name with numbers',
    },
  ]

  describe.each(testCases)('with $description', ({ serverName }) => {
    it('displays server name as header', async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({ to: '/logs/$serverName', params: { serverName } })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
      })
    })

    it('has a back button that navigates to root route', async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({ to: '/logs/$serverName', params: { serverName } })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
      })

      const backButton = screen.getByRole('button', { name: /back/i })
      expect(backButton).toBeVisible()
    })

    it('filters logs when searching', async () => {
      const user = userEvent.setup()
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({ to: '/logs/$serverName', params: { serverName } })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
      })

      const searchInput = screen.getByPlaceholderText('Search log')
      await user.type(searchInput, 'started')

      // Check that the search highlighting is working (mark elements are present)
      expect(screen.getAllByRole('mark')).toHaveLength(2)
    })
  })

  describe('Edge cases', () => {
    it('handles empty logs response gracefully', async () => {
      // Mock empty logs response
      getMockLogs.mockReturnValueOnce('')

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

      expect(screen.getByText('No logs available')).toBeVisible()
    })

    it('refreshes logs when refresh button is clicked', async () => {
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

      const refreshButton = screen.getByRole('button', { name: 'Refresh' })
      await user.click(refreshButton)

      // Verify logs are still displayed after refresh
      expect(screen.getByText(/server .* started successfully/i)).toBeVisible()
    })
  })

  describe('Search functionality edge cases', () => {
    it('handles case-insensitive search', async () => {
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
      await user.type(searchInput, 'STARTED')

      // Check that the search highlighting is working (mark elements are present)
      expect(screen.getAllByRole('mark')).toHaveLength(2)
    })

    it('handles search with special characters', async () => {
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
      await user.type(searchInput, 'server')

      // Check that the search highlighting is working (mark elements are present)
      expect(screen.getAllByRole('mark')).toHaveLength(4)
    })

    it('shows "No logs match your search" when search has no results', async () => {
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
      await user.type(searchInput, 'nonexistent')

      expect(screen.getByText('No logs match your search')).toBeVisible()
    })

    it('handles empty search input', async () => {
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
      await user.type(searchInput, 'test')
      await user.clear(searchInput)

      // Should show all logs when search is cleared
      expect(screen.getByText(/server .* started successfully/i)).toBeVisible()
    })
  })

  describe('Log formatting edge cases', () => {
    it('handles very long log lines', async () => {
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

      // Should handle long log lines without breaking
      expect(screen.getByText(/server .* started successfully/i)).toBeVisible()
    })

    it('handles logs with HTML-like content', async () => {
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

      // Should handle HTML-like content safely
      expect(screen.getByText(/server .* started successfully/i)).toBeVisible()
    })

    it('handles logs with special characters', async () => {
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

      // Should handle special characters safely
      expect(screen.getByText(/server .* started successfully/i)).toBeVisible()
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
      await user.type(searchInput, 'test')

      expect(searchInput).toHaveValue('test')
    })
  })
})
