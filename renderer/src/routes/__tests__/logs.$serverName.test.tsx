import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogsPage } from '@/features/mcp-servers/sub-pages/logs-page'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import userEvent from '@testing-library/user-event'
import { getMockLogs } from '@/common/mocks/customHandlers/fixtures/servers'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import { HttpResponse } from 'msw'
import { mockedGetApiV1BetaWorkloadsByName } from '@/common/mocks/fixtures/workloads_name/get'

describe('Logs Route', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  const testCases = [
    {
      serverName: 'postgres-db',
      groupName: 'default',
      description: 'simple server name',
    },
    {
      serverName: 'vscode-server',
      groupName: 'production',
      description: 'server name with hyphens',
    },
    {
      serverName: 'github',
      groupName: 'research',
      description: 'server name with numbers',
    },
  ]

  testCases.forEach(({ serverName, groupName, description }) => {
    it(`displays server name as header for ${description}`, async () => {
      const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
      router.navigate({
        to: '/logs/$groupName/$serverName',
        params: { serverName, groupName },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
      })
    })

    it(`has a back button that navigates to correct group for ${description}`, async () => {
      const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
      router.navigate({
        to: '/logs/$groupName/$serverName',
        params: { serverName, groupName },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
      })

      const backButton = screen.getByRole('button', { name: /back/i })
      expect(backButton).toBeVisible()
      expect(backButton.closest('a')).toHaveAttribute(
        'href',
        `/group/${groupName}`
      )

      await userEvent.click(backButton)

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(`/group/${groupName}`)
      })
    })

    it(`filters logs when searching for ${description}`, async () => {
      const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
      router.navigate({
        to: '/logs/$groupName/$serverName',
        params: { serverName, groupName },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
      })

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-logs')).not.toBeInTheDocument()
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

  it('navigates back to MCP optimizer page when viewing meta-mcp logs', async () => {
    mockedGetApiV1BetaWorkloadsByName.overrideHandler((_, info) => {
      const { name } = info.params
      if (name === META_MCP_SERVER_NAME) {
        const logs = getMockLogs(name as string)
        return new HttpResponse(logs, { status: 200 })
      }
      return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
    })

    const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
    router.navigate({
      to: '/logs/$groupName/$serverName',
      params: {
        serverName: META_MCP_SERVER_NAME,
        groupName: MCP_OPTIMIZER_GROUP_NAME,
      },
    })
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'MCP Optimizer' })
      ).toBeVisible()
    })

    const backButton = screen.getByRole('button', { name: /back/i })
    expect(backButton).toBeVisible()

    expect(backButton.closest('a')).toHaveAttribute('href', '/mcp-optimizer')

    await userEvent.click(backButton)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/mcp-optimizer')
    })
  })

  it('handles empty logs response gracefully', async () => {
    const serverName = 'empty-logs-server'
    const groupName = 'default'
    const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
    router.navigate({
      to: '/logs/$groupName/$serverName',
      params: { serverName, groupName },
    })
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: serverName })).toBeVisible()
    })

    await waitFor(() => {
      expect(screen.queryByTestId('skeleton-logs')).not.toBeInTheDocument()
    })

    expect(screen.getByText('No logs available')).toBeVisible()
  })

  it('refreshes logs when refresh button is clicked', async () => {
    const serverName = 'postgres-db'
    const groupName = 'default'
    const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
    router.navigate({
      to: '/logs/$groupName/$serverName',
      params: { serverName, groupName },
    })
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
