import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogsPage } from '@/features/mcp-servers/sub-pages/logs-page'
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
    it(`displays server name as header for ${description}`, async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({ to: '/logs/$serverName', params: { serverName } })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Logs' })).toBeVisible()
      })
    })

    it(`has a back button that navigates to root route for ${description}`, async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({ to: '/logs/$serverName', params: { serverName } })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Logs' })).toBeVisible()
      })

      const backButton = screen.getByRole('link', { name: /back/i })
      expect(backButton).toBeVisible()
      expect(backButton).toHaveAttribute('href', '/')

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
        expect(screen.getByRole('heading', { name: 'Logs' })).toBeVisible()
      })

      expect(
        screen.queryAllByText(/server .* started successfully/i).length
      ).toBeGreaterThan(0)

      const search = screen.getByPlaceholderText('Filter...')
      await userEvent.type(search, 'database')

      expect(
        screen.queryAllByText(/database connection established/i).length
      ).toBeGreaterThan(0)
      expect(
        screen.queryAllByText(/server .* started successfully/i).length
      ).toBe(0)

      await userEvent.clear(search)

      expect(
        screen.queryAllByText(/server .* started successfully/i).length
      ).toBeGreaterThan(0)
    })
  })
})
