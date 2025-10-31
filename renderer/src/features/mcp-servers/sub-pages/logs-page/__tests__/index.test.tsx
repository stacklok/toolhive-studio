import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LogsPage } from '../index'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { getMockLogs } from '@/common/mocks/customHandlers/fixtures/servers'

describe('LogsPage Component', () => {
  describe('Loading State - Skeleton', () => {
    it('displays skeleton while loading logs', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})

      server.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name/logs'), async () => {
          return HttpResponse.text(getMockLogs('test-server'))
        })
      )

      const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
      router.navigate({
        to: '/logs/$groupName/$serverName',
        params: { serverName: 'test-server', groupName: 'default' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByTestId('skeleton-logs')).toBeVisible()
      })
    })
  })

  describe('Basic Rendering', () => {
    it('displays server name as heading for regular server', async () => {
      const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
      router.navigate({
        to: '/logs/$groupName/$serverName',
        params: { serverName: 'test-server', groupName: 'default' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'test-server' })
        ).toBeVisible()
      })
    })

    it('renders search input', async () => {
      const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
      router.navigate({
        to: '/logs/$groupName/$serverName',
        params: { serverName: 'test-server', groupName: 'default' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search log')).toBeVisible()
      })
    })

    it('renders back button with correct link', async () => {
      const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
      router.navigate({
        to: '/logs/$groupName/$serverName',
        params: { serverName: 'test-server', groupName: 'production' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'test-server' })
        ).toBeVisible()
      })

      const backButton = screen.getByRole('button', { name: /back/i })
      expect(backButton.closest('a')).toHaveAttribute(
        'href',
        '/group/production'
      )
    })
  })

  describe('MCP Optimizer Special Handling', () => {
    it('displays "MCP Optimizer" as title for optimizer group', async () => {
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
    })

    it('back button links to /mcp-optimizer for optimizer group', async () => {
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
      expect(backButton.closest('a')).toHaveAttribute('href', '/mcp-optimizer')
    })
  })
})
