import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import { useCleanupMetaOptimizer } from '../use-cleanup-meta-optimizer'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import { recordRequests } from '@/common/mocks/node'
import { mockedGetApiV1BetaGroups } from '@/common/mocks/fixtures/groups/get'
import { mockedGetApiV1BetaWorkloadsByName } from '@/common/mocks/fixtures/workloads_name/get'
import { mockedPostApiV1BetaClientsRegister } from '@/common/mocks/fixtures/clients_register/post'
import { mockedDeleteApiV1BetaGroupsByName } from '@/common/mocks/fixtures/groups_name/delete'
import { mockedGetApiV1BetaDiscoveryClients } from '@/common/mocks/fixtures/discovery_clients/get'

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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns cleanupMetaOptimizer function', () => {
    const { result } = renderHook(() => useCleanupMetaOptimizer(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toHaveProperty('cleanupMetaOptimizer')
    expect(typeof result.current.cleanupMetaOptimizer).toBe('function')
  })

  it('does not cleanup when optimizer group does not exist', async () => {
    const rec = recordRequests()

    mockedGetApiV1BetaGroups.override((data) => ({
      ...data,
      groups: [{ name: 'default', registered_clients: [] }],
    }))

    const { result } = renderHook(() => useCleanupMetaOptimizer(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.cleanupMetaOptimizer()
    })

    const deleteGroupCalls = rec.recordedRequests.filter(
      (r) =>
        r.method === 'DELETE' &&
        r.pathname.includes(`/api/v1beta/groups/${MCP_OPTIMIZER_GROUP_NAME}`)
    )
    expect(deleteGroupCalls.length).toBe(0)
  })

  it('deletes the group even when it has no registered clients', async () => {
    const rec = recordRequests()

    mockedGetApiV1BetaGroups.override((data) => ({
      ...data,
      groups: [{ name: MCP_OPTIMIZER_GROUP_NAME, registered_clients: [] }],
    }))

    mockedDeleteApiV1BetaGroupsByName.override(() => '')

    const { result } = renderHook(() => useCleanupMetaOptimizer(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.cleanupMetaOptimizer()
    })

    const deleteGroupCalls = rec.recordedRequests.filter(
      (r) =>
        r.method === 'DELETE' &&
        r.pathname.includes(`/api/v1beta/groups/${MCP_OPTIMIZER_GROUP_NAME}`)
    )
    expect(deleteGroupCalls.length).toBe(1)
  })

  it('removes all clients and deletes group when cleanup is called', async () => {
    const rec = recordRequests()

    mockedGetApiV1BetaGroups.override((data) => ({
      ...data,
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
    }))

    mockedGetApiV1BetaWorkloadsByName.override((data) => ({
      ...data,
      name: META_MCP_SERVER_NAME,
      env_vars: {
        ALLOWED_GROUPS: 'production',
      },
    }))

    mockedPostApiV1BetaClientsRegister.activateScenario('empty')
    // DELETE /clients/:name/groups/:group is a 204 - auto-mocker handles it
    mockedDeleteApiV1BetaGroupsByName.override(() => '')
    mockedGetApiV1BetaDiscoveryClients.activateScenario('empty')

    const { result } = renderHook(() => useCleanupMetaOptimizer(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.cleanupMetaOptimizer()
    })

    const deleteCalls = rec.recordedRequests.filter(
      (r) => r.method === 'DELETE' && r.pathname.includes('/api/v1beta/clients')
    )
    expect(deleteCalls.length).toBe(2)

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

  it('skips client restoration when ALLOWED_GROUPS points to a missing group', async () => {
    const rec = recordRequests()

    mockedGetApiV1BetaGroups.override((data) => ({
      ...data,
      groups: [
        {
          name: MCP_OPTIMIZER_GROUP_NAME,
          registered_clients: ['client1'],
        },
      ],
    }))

    mockedGetApiV1BetaWorkloadsByName.override((data) => ({
      ...data,
      name: META_MCP_SERVER_NAME,
      env_vars: {
        ALLOWED_GROUPS: 'nonexistent-group',
      },
    }))

    mockedDeleteApiV1BetaGroupsByName.override(() => '')

    const { result } = renderHook(() => useCleanupMetaOptimizer(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.cleanupMetaOptimizer()
    })

    const registerCalls = rec.recordedRequests.filter(
      (r) =>
        r.method === 'POST' &&
        r.pathname.includes('/api/v1beta/clients/register')
    )
    expect(registerCalls.length).toBe(0)

    const unregisterCalls = rec.recordedRequests.filter(
      (r) => r.method === 'DELETE' && r.pathname.includes('/api/v1beta/clients')
    )
    expect(unregisterCalls.length).toBe(1)

    const deleteGroupCalls = rec.recordedRequests.filter(
      (r) =>
        r.method === 'DELETE' &&
        r.pathname.includes(`/api/v1beta/groups/${MCP_OPTIMIZER_GROUP_NAME}`)
    )
    expect(deleteGroupCalls.length).toBe(1)
  })
})
