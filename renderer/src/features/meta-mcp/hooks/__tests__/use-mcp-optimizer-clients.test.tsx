import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useMcpOptimizerClients } from '../use-mcp-optimizer-clients'
import { server, recordRequests } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'
import { queryClient } from '@/common/lib/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

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
      )
    )

    const rec = recordRequests()

    const { result } = renderHook(() => useMcpOptimizerClients(), { wrapper })

    await result.current.saveGroupClients('test')

    await waitFor(() => {
      const registerRequest = rec.recordedRequests.find(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/register'
      )

      expect(registerRequest).toBeDefined()
      expect(registerRequest?.payload).toEqual({
        names: ['vscode', 'windsurf'],
        groups: [MCP_OPTIMIZER_GROUP_NAME],
      })
    })
  })

  it('unregister clients that are not in selected group', async () => {
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

    await result.current.saveGroupClients('test')

    await waitFor(() => {
      const unregisterRequest = rec.recordedRequests.find(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/unregister'
      )

      expect(unregisterRequest).toBeDefined()
      expect(unregisterRequest?.payload).toEqual({
        names: ['vscode', 'windsurf'],
        groups: [MCP_OPTIMIZER_GROUP_NAME],
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

    await result.current.saveGroupClients('test')

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

      expect(registerRequest?.payload).toEqual({
        names: ['claude-code'],
        groups: [MCP_OPTIMIZER_GROUP_NAME],
      })

      expect(unregisterRequest?.payload).toEqual({
        names: ['vscode'],
        groups: [MCP_OPTIMIZER_GROUP_NAME],
      })
    })
  })

  it('not make any requests when clients are already synced', async () => {
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
      )
    )

    const rec = recordRequests()

    const { result } = renderHook(() => useMcpOptimizerClients(), { wrapper })

    await result.current.saveGroupClients('test')

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
      )
    )

    const rec = recordRequests()

    const { result } = renderHook(() => useMcpOptimizerClients(), { wrapper })

    await result.current.saveGroupClients('test')

    await waitFor(() => {
      const registerRequest = rec.recordedRequests.find(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/clients/register'
      )

      expect(registerRequest?.payload).toEqual({
        names: ['cursor', 'vscode'],
        groups: [MCP_OPTIMIZER_GROUP_NAME],
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

    await result.current.saveGroupClients('non-existent')

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
})
