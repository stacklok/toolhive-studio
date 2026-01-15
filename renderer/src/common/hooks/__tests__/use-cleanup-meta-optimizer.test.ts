import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import { useCleanupMetaOptimizer } from '../use-cleanup-meta-optimizer'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import { recordRequests, server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'

// Mock dependencies
vi.mock('../use-feature-flag')
vi.mock('@/features/mcp-servers/hooks/use-mutation-delete-group')

const { useFeatureFlag } = await import('../use-feature-flag')
const { useMutationDeleteGroup } = await import(
  '@/features/mcp-servers/hooks/use-mutation-delete-group'
)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

describe('useCleanupMetaOptimizer', () => {
  const mockDeleteGroup = vi.fn()
  const mockUnregisterClient = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMutationDeleteGroup).mockReturnValue({
      mutateAsync: mockDeleteGroup,
    } as unknown as ReturnType<typeof useMutationDeleteGroup>)
  })

  it('returns cleanupMetaOptimizer function', () => {
    vi.mocked(useFeatureFlag).mockReturnValue(false)

    const { result } = renderHook(() => useCleanupMetaOptimizer(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toHaveProperty('cleanupMetaOptimizer')
    expect(typeof result.current.cleanupMetaOptimizer).toBe('function')
  })

  it('does not cleanup when feature flags are disabled', async () => {
    vi.mocked(useFeatureFlag).mockReturnValue(false)

    const { result } = renderHook(() => useCleanupMetaOptimizer(), {
      wrapper: createWrapper(),
    })

    await result.current.cleanupMetaOptimizer()

    expect(mockDeleteGroup).not.toHaveBeenCalled()
    expect(mockUnregisterClient).not.toHaveBeenCalled()
  })

  it('does not cleanup when group has no registered clients', async () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true)

    server.use(
      http.get('*/api/v1beta/groups', () =>
        HttpResponse.json({
          groups: [{ name: MCP_OPTIMIZER_GROUP_NAME, registered_clients: [] }],
        })
      )
    )

    const { result } = renderHook(() => useCleanupMetaOptimizer(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.cleanupMetaOptimizer).toBeDefined()
    })

    await result.current.cleanupMetaOptimizer()

    expect(mockDeleteGroup).not.toHaveBeenCalled()
  })

  it('removes all clients and deletes group when cleanup is called', async () => {
    const rec = recordRequests()
    vi.mocked(useFeatureFlag).mockReturnValue(true)

    server.use(
      http.get('*/api/v1beta/groups', () =>
        HttpResponse.json({
          groups: [
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: ['client1', 'client2'],
            },
            {
              name: 'production',
              registered_clients: [],
            },
          ],
        })
      ),
      http.get(`*/api/v1beta/workloads/${META_MCP_SERVER_NAME}`, () =>
        HttpResponse.json({
          env_vars: {
            ALLOWED_GROUPS: 'production',
          },
        })
      ),
      http.post('*/api/v1beta/clients/register', () => HttpResponse.json([])),
      http.delete('*/api/v1beta/clients/:name/groups/:group', () =>
        HttpResponse.json({})
      ),
      http.delete(`*/api/v1beta/groups/${MCP_OPTIMIZER_GROUP_NAME}`, () =>
        HttpResponse.json({})
      ),
      http.get('*/api/v1beta/discovery/clients', () =>
        HttpResponse.json({ clients: [] })
      )
    )

    const { result } = renderHook(() => useCleanupMetaOptimizer(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      const groupsCalls = rec.recordedRequests.filter(
        (r) => r.method === 'GET' && r.pathname.includes('/api/v1beta/groups')
      )
      expect(groupsCalls.length).toBeGreaterThan(0)
    })

    await result.current.cleanupMetaOptimizer()

    await waitFor(() => {
      const deleteCalls = rec.recordedRequests.filter(
        (r) =>
          r.method === 'DELETE' && r.pathname.includes('/api/v1beta/clients')
      )
      expect(deleteCalls.length).toBe(2)
    })

    // Verify clients were registered to allowed group first
    const registerCalls = rec.recordedRequests.filter(
      (r) =>
        r.method === 'POST' &&
        r.pathname.includes('/api/v1beta/clients/register')
    )
    expect(registerCalls.length).toBe(1)
    expect(registerCalls[0]?.payload).toEqual({
      names: ['client1', 'client2'],
      groups: ['production'],
    })

    // Verify clients were unregistered from optimizer group
    const deleteClientCalls = rec.recordedRequests.filter(
      (r) => r.method === 'DELETE' && r.pathname.includes('/api/v1beta/clients')
    )

    expect(deleteClientCalls[0]?.pathname).toBe(
      `/api/v1beta/clients/client1/groups/${MCP_OPTIMIZER_GROUP_NAME}`
    )
    expect(deleteClientCalls[1]?.pathname).toBe(
      `/api/v1beta/clients/client2/groups/${MCP_OPTIMIZER_GROUP_NAME}`
    )

    // Verify group deletion was called
    const deleteGroupCalls = rec.recordedRequests.filter(
      (r) =>
        r.method === 'DELETE' &&
        r.pathname.includes(`/api/v1beta/groups/${MCP_OPTIMIZER_GROUP_NAME}`)
    )
    expect(deleteGroupCalls.length).toBe(1)
  })
})
