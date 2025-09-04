import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAddClientToGroup } from '../use-add-client-to-group'

describe('useAddClientToGroup', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  it('should add a client to a group and invalidate discovery clients query', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () => useAddClientToGroup({ clientType: 'test-client' }),
      { wrapper }
    )

    // Execute the addClientToGroup function
    await result.current.addClientToGroup({ groupName: 'research-team' })

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: [
          {
            _id: 'getApiV1BetaDiscoveryClients',
            baseUrl: 'https://foo.bar.com',
          },
        ],
      })
    })
  })

  it('should handle different group names', async () => {
    const { result } = renderHook(
      () => useAddClientToGroup({ clientType: 'test-client' }),
      { wrapper }
    )

    // Should work with different group names
    await expect(
      result.current.addClientToGroup({ groupName: 'default' })
    ).resolves.not.toThrow()

    await expect(
      result.current.addClientToGroup({ groupName: 'custom-group' })
    ).resolves.not.toThrow()
  })
})
