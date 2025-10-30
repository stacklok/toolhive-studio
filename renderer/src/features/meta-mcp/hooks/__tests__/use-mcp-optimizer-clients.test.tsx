import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMcpOptimizerClients } from '../use-mcp-optimizer-clients'
import { server, recordRequests } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'
import { queryClient } from '@/common/lib/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/common/hooks/use-feature-flag', () => ({
  useFeatureFlag: vi.fn(() => true),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useMcpOptimizerClients', () => {
  beforeEach(() => {
    queryClient.clear()
  })

  it('register clients that are missing from optimizer group', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: 'test',
              registered_clients: ['cursor', 'vscode', 'windsurf'],
            },
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: ['cursor'],
            },
          ],
        })
      ),
      http.post(mswEndpoint('/api/v1beta/clients/register'), () =>
        HttpResponse.json([])
      ),
      http.post(mswEndpoint('/api/v1beta/clients/unregister'), () =>
        HttpResponse.json(null, { status: 204 })
      )
    )

    const rec = recordRequests()

    const { result } = renderHook(() => useMcpOptimizerClients(), { wrapper })

    await result.current.saveGroupClients({ groupName: 'test' })

    await waitFor(() => {
      const registerRequest = rec.recordedRequests.find(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/register'
      )
      const unregisterRequests = rec.recordedRequests.filter(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/unregister'
      )

      expect(registerRequest).toBeDefined()
      expect(registerRequest?.payload).toEqual({
        names: ['vscode', 'windsurf'],
        groups: [MCP_OPTIMIZER_GROUP_NAME],
      })

      expect(unregisterRequests).toHaveLength(1)
      expect(unregisterRequests[0]?.payload).toEqual({
        names: ['cursor', 'vscode', 'windsurf'],
        groups: ['test'],
      })
    })
  })

  it('unregister clients that are disabled in clientsStatus', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: 'test',
              registered_clients: ['cursor'],
            },
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: ['cursor', 'vscode', 'windsurf'],
            },
          ],
        })
      ),
      http.post(mswEndpoint('/api/v1beta/clients/unregister'), () =>
        HttpResponse.json(null, { status: 204 })
      )
    )

    const rec = recordRequests()

    const { result } = renderHook(() => useMcpOptimizerClients(), { wrapper })

    await result.current.saveGroupClients({
      groupName: 'test',
      clientsStatus: {
        enableVscode: false,
        enableWindsurf: false,
      },
    })

    await waitFor(() => {
      const unregisterRequests = rec.recordedRequests.filter(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/unregister'
      )

      expect(unregisterRequests).toHaveLength(2)
      expect(unregisterRequests[0]?.payload).toEqual({
        names: ['vscode', 'windsurf'],
        groups: [MCP_OPTIMIZER_GROUP_NAME],
      })
      expect(unregisterRequests[1]?.payload).toEqual({
        names: ['cursor'],
        groups: ['test'],
      })
    })
  })

  it('both register and unregister clients in same sync', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: 'test',
              registered_clients: ['cursor', 'claude-code'],
            },
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: ['cursor', 'vscode'],
            },
          ],
        })
      ),
      http.post(mswEndpoint('/api/v1beta/clients/register'), () =>
        HttpResponse.json([])
      ),
      http.post(mswEndpoint('/api/v1beta/clients/unregister'), () =>
        HttpResponse.json(null, { status: 204 })
      )
    )

    const rec = recordRequests()

    const { result } = renderHook(() => useMcpOptimizerClients(), { wrapper })

    await result.current.saveGroupClients({
      groupName: 'test',
      clientsStatus: {
        enableVscode: false,
      },
    })

    await waitFor(() => {
      const registerRequest = rec.recordedRequests.find(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/register'
      )
      const unregisterRequests = rec.recordedRequests.filter(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/unregister'
      )

      expect(registerRequest?.payload).toEqual({
        names: ['claude-code'],
        groups: [MCP_OPTIMIZER_GROUP_NAME],
      })

      expect(unregisterRequests).toHaveLength(2)
      expect(unregisterRequests[0]?.payload).toEqual({
        names: ['vscode'],
        groups: [MCP_OPTIMIZER_GROUP_NAME],
      })
      expect(unregisterRequests[1]?.payload).toEqual({
        names: ['cursor', 'claude-code'],
        groups: ['test'],
      })
    })
  })

  it('remove clients from source group even when already synced', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: 'test',
              registered_clients: ['cursor', 'vscode'],
            },
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: ['cursor', 'vscode'],
            },
          ],
        })
      ),
      http.post(mswEndpoint('/api/v1beta/clients/unregister'), () =>
        HttpResponse.json(null, { status: 204 })
      )
    )

    const rec = recordRequests()

    const { result } = renderHook(() => useMcpOptimizerClients(), { wrapper })

    await result.current.saveGroupClients({ groupName: 'test' })

    await waitFor(() => {
      const registerRequest = rec.recordedRequests.find(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/register'
      )
      const unregisterRequests = rec.recordedRequests.filter(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/unregister'
      )

      expect(registerRequest).toBeUndefined()
      expect(unregisterRequests).toHaveLength(1)
      expect(unregisterRequests[0]?.payload).toEqual({
        names: ['cursor', 'vscode'],
        groups: ['test'],
      })
    })
  })

  it('sync all clients when optimizer group is empty', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: 'test',
              registered_clients: ['cursor', 'vscode'],
            },
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: [],
            },
          ],
        })
      ),
      http.post(mswEndpoint('/api/v1beta/clients/register'), () =>
        HttpResponse.json([])
      ),
      http.post(mswEndpoint('/api/v1beta/clients/unregister'), () =>
        HttpResponse.json(null, { status: 204 })
      )
    )

    const rec = recordRequests()

    const { result } = renderHook(() => useMcpOptimizerClients(), { wrapper })

    await result.current.saveGroupClients({ groupName: 'test' })

    await waitFor(() => {
      const registerRequest = rec.recordedRequests.find(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/register'
      )
      const unregisterRequests = rec.recordedRequests.filter(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/unregister'
      )

      expect(registerRequest?.payload).toEqual({
        names: ['cursor', 'vscode'],
        groups: [MCP_OPTIMIZER_GROUP_NAME],
      })

      expect(unregisterRequests).toHaveLength(1)
      expect(unregisterRequests[0]?.payload).toEqual({
        names: ['cursor', 'vscode'],
        groups: ['test'],
      })
    })
  })

  it('should handle non-existent group gracefully', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: ['cursor'],
            },
          ],
        })
      )
    )

    const rec = recordRequests()

    const { result } = renderHook(() => useMcpOptimizerClients(), { wrapper })

    await result.current.saveGroupClients({ groupName: 'non-existent' })

    await waitFor(() => {
      const registerRequest = rec.recordedRequests.find(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/register'
      )
      const unregisterRequest = rec.recordedRequests.find(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/unregister'
      )

      expect(registerRequest).toBeUndefined()
      expect(unregisterRequest).toBeUndefined()
    })
  })

  it('should restore clients from optimizer group to target group', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: ['cursor', 'vscode', 'windsurf'],
            },
            {
              name: 'production',
              registered_clients: [],
            },
          ],
        })
      ),
      http.post(mswEndpoint('/api/v1beta/clients/register'), () =>
        HttpResponse.json([])
      )
    )

    const rec = recordRequests()

    const { result } = renderHook(() => useMcpOptimizerClients(), { wrapper })

    await result.current.restoreClientsToGroup('production')

    await waitFor(() => {
      const registerRequest = rec.recordedRequests.find(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/register'
      )

      expect(registerRequest).toBeDefined()
      expect(registerRequest?.payload).toEqual({
        names: ['cursor', 'vscode', 'windsurf'],
        groups: ['production'],
      })
    })
  })

  it('should handle empty optimizer group when restoring clients', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: [],
            },
            {
              name: 'production',
              registered_clients: [],
            },
          ],
        })
      )
    )

    const rec = recordRequests()

    const { result } = renderHook(() => useMcpOptimizerClients(), { wrapper })

    await result.current.restoreClientsToGroup('production')

    await waitFor(() => {
      const registerRequest = rec.recordedRequests.find(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/register'
      )

      expect(registerRequest).toBeUndefined()
    })
  })

  it('should restore clients to previous allowed group when switching groups', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: 'staging',
              registered_clients: ['cursor', 'vscode'],
            },
            {
              name: 'production',
              registered_clients: [],
            },
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: ['cursor', 'vscode'],
            },
          ],
        })
      ),
      http.post(mswEndpoint('/api/v1beta/clients/register'), () =>
        HttpResponse.json([])
      ),
      http.post(mswEndpoint('/api/v1beta/clients/unregister'), () =>
        HttpResponse.json(null, { status: 204 })
      )
    )

    const rec = recordRequests()

    const { result } = renderHook(() => useMcpOptimizerClients(), { wrapper })

    await result.current.saveGroupClients({
      groupName: 'staging',
      previousGroupName: 'production',
    })

    await waitFor(() => {
      const registerRequests = rec.recordedRequests.filter(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/register'
      )

      expect(registerRequests.length).toBeGreaterThan(0)
      expect(registerRequests[0]?.payload).toEqual({
        names: ['cursor', 'vscode'],
        groups: ['production'],
      })
    })
  })
})
