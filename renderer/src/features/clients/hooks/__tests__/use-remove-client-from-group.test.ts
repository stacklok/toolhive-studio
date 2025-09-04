import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRemoveClientFromGroup } from '../use-remove-client-from-group'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'

describe('useRemoveClientFromGroup', () => {
  let queryClient: QueryClient
  let capturedRequests: Array<{
    method: string
    clientName: string
    groupName: string
    url: string
  }> = []

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    capturedRequests = []
  })

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  it('should send correct client name and group in API request', async () => {
    // Mock the group-specific API endpoint to capture requests
    server.use(
      http.delete(
        mswEndpoint('/api/v1beta/clients/:name/groups/:group'),
        async ({ request, params }) => {
          capturedRequests.push({
            method: 'DELETE',
            clientName: params.name,
            groupName: params.group,
            url: request.url,
          })
          return new HttpResponse(null, { status: 204 })
        }
      )
    )

    const { result } = renderHook(
      () => useRemoveClientFromGroup({ clientType: 'test-client' }),
      { wrapper }
    )

    // Execute the removeClientFromGroup function
    await result.current.removeClientFromGroup({ groupName: 'research-team' })

    await waitFor(() => {
      expect(capturedRequests).toHaveLength(1)
      expect(capturedRequests[0]).toEqual({
        method: 'DELETE',
        clientName: 'test-client',
        groupName: 'research-team',
        url: expect.stringContaining(
          '/api/v1beta/clients/test-client/groups/research-team'
        ),
      })
    })
  })

  it('should handle different client types and groups correctly', async () => {
    // Mock the group-specific API endpoint to capture requests
    server.use(
      http.delete(
        mswEndpoint('/api/v1beta/clients/:name/groups/:group'),
        async ({ request, params }) => {
          capturedRequests.push({
            method: 'DELETE',
            clientName: params.name,
            groupName: params.group,
            url: request.url,
          })
          return new HttpResponse(null, { status: 204 })
        }
      )
    )

    const { result } = renderHook(
      () => useRemoveClientFromGroup({ clientType: 'vscode' }),
      { wrapper }
    )

    // Test with different group names
    await result.current.removeClientFromGroup({ groupName: 'default' })
    await result.current.removeClientFromGroup({ groupName: 'custom-group' })

    await waitFor(() => {
      expect(capturedRequests).toHaveLength(2)
      expect(capturedRequests[0]).toEqual({
        method: 'DELETE',
        clientName: 'vscode',
        groupName: 'default',
        url: expect.stringContaining(
          '/api/v1beta/clients/vscode/groups/default'
        ),
      })
      expect(capturedRequests[1]).toEqual({
        method: 'DELETE',
        clientName: 'vscode',
        groupName: 'custom-group',
        url: expect.stringContaining(
          '/api/v1beta/clients/vscode/groups/custom-group'
        ),
      })
    })
  })

  it('should invalidate discovery clients query after successful unregistration', async () => {
    // Mock the group-specific API endpoint
    server.use(
      http.delete(
        mswEndpoint('/api/v1beta/clients/:name/groups/:group'),
        async () => {
          return new HttpResponse(null, { status: 204 })
        }
      )
    )

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () => useRemoveClientFromGroup({ clientType: 'test-client' }),
      { wrapper }
    )

    await result.current.removeClientFromGroup({ groupName: 'research-team' })

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
})
