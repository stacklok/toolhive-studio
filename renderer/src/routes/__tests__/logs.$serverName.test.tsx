import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LogsPage } from '@/features/mcp-servers/pages/logs-page'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'

describe('Logs Route', () => {
  const testCases = [
    { serverName: 'test-server-1', description: 'simple server name' },
    {
      serverName: 'my-awesome-server',
      description: 'server name with hyphens',
    },
    { serverName: 'server123', description: 'server name with numbers' },
  ]

  testCases.forEach(({ serverName, description }) => {
    it(`should display server name in header for ${description}`, async () => {
      const router = createTestRouter(LogsPage, '/logs/$serverName')
      router.navigate({ to: '/logs/$serverName', params: { serverName } })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText(`Logs for ${serverName}`)).toBeVisible()
      })
    })
  })
})
