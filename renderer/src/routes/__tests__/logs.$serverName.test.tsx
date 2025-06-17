import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogsPage } from '@/features/mcp-servers/pages/logs-page'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import userEvent from '@testing-library/user-event'

describe('Logs Route', () => {
  beforeEach(() => {
    // Mock console.warn to prevent test failures from expected warnings
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  const testCases = [
    { serverName: 'test-server-1', description: 'simple server name' },
    {
      serverName: 'my-awesome-server',
      description: 'server name with hyphens',
    },
    { serverName: 'server123', description: 'server name with numbers' },
  ]

  testCases.forEach(({ serverName, description }) => {
    it(`should display server name as header for ${description}`, async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({ to: '/logs/$serverName', params: { serverName } })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
      })
    })

    it(`should have a back button that navigates to root route for ${description}`, async () => {
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

    it(`should filter logs when searching for ${description}`, async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({ to: '/logs/$serverName', params: { serverName } })
      renderRoute(router)

      // Wait for logs to appear
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
      })

      expect(
        screen.queryByText(/server .* started successfully/i)
      ).toBeVisible()

      const search = screen.getByPlaceholderText('Search log')
      // Type a search term that matches only one log line
      await userEvent.type(search, 'database')

      // Only lines containing 'database' should be visible
      expect(screen.getByText(/database connection established/i)).toBeVisible()
      // A line that doesn't match should not be in the document
      expect(
        screen.queryByText(/server .* started successfully/i)
      ).not.toBeInTheDocument()

      await userEvent.clear(search)

      expect(
        screen.queryByText(/server .* started successfully/i)
      ).toBeVisible()
    })
  })
})
