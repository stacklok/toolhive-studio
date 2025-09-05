import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAddClientToGroup } from '../use-add-client-to-group'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'

describe('useAddClientToGroup', () => {
  let queryClient: QueryClient
  let capturedRequests: Array<{ name: string; groups: string[] }> = []

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

  it('should send correct group name in API request', async () => {
    // Mock the API endpoint to capture requests
    server.use(
      http.post(mswEndpoint('/api/v1beta/clients'), async ({ request }) => {
        const body = await request.json()
        const requestBody = body as { name: string; groups: string[] }
        capturedRequests.push(requestBody)
        return HttpResponse.json(
          { name: requestBody.name, groups: requestBody.groups },
          { status: 200 }
        )
      })
    )

    const { result } = renderHook(
      () => useAddClientToGroup({ clientType: 'test-client' }),
      { wrapper }
    )

    // Execute the addClientToGroup function with a specific group
    await result.current.addClientToGroup({ groupName: 'research-team' })

    await waitFor(() => {
      expect(capturedRequests).toHaveLength(1)
      expect(capturedRequests[0]).toEqual({
        name: 'test-client',
        groups: ['research-team'],
      })
    })
  })

  it('should send different group names correctly', async () => {
    // Mock the API endpoint to capture requests
    server.use(
      http.post(mswEndpoint('/api/v1beta/clients'), async ({ request }) => {
        const body = await request.json()
        const requestBody = body as { name: string; groups: string[] }
        capturedRequests.push(requestBody)
        return HttpResponse.json(
          { name: requestBody.name, groups: requestBody.groups },
          { status: 200 }
        )
      })
    )

    const { result } = renderHook(
      () => useAddClientToGroup({ clientType: 'vscode' }),
      { wrapper }
    )

    // Test with different group names
    await result.current.addClientToGroup({ groupName: 'default' })
    await result.current.addClientToGroup({ groupName: 'custom-group' })

    await waitFor(() => {
      expect(capturedRequests).toHaveLength(2)
      expect(capturedRequests[0]).toEqual({
        name: 'vscode',
        groups: ['default'],
      })
      expect(capturedRequests[1]).toEqual({
        name: 'vscode',
        groups: ['custom-group'],
      })
    })
  })

  it('should handle different group names correctly', async () => {
    // Mock the API endpoint to capture requests
    server.use(
      http.post(mswEndpoint('/api/v1beta/clients'), async ({ request }) => {
        const body = (await request.json()) as {
          name: string
          groups: string[]
        }
        const requestBody = body as { name: string; groups: string[] }
        capturedRequests.push(requestBody)
        return HttpResponse.json(
          { name: requestBody.name, groups: requestBody.groups },
          { status: 200 }
        )
      })
    )

    const { result } = renderHook(
      () => useAddClientToGroup({ clientType: 'vscode' }),
      { wrapper }
    )

    // Test with different group names
    await result.current.addClientToGroup({ groupName: 'default' })
    await result.current.addClientToGroup({ groupName: 'custom-group' })

    await waitFor(() => {
      expect(capturedRequests).toHaveLength(2)
      expect(capturedRequests[0]).toEqual({
        name: 'vscode',
        groups: ['default'],
      })
      expect(capturedRequests[1]).toEqual({
        name: 'vscode',
        groups: ['custom-group'],
      })
    })
  })

  it('should invalidate discovery clients query after successful registration', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () => useAddClientToGroup({ clientType: 'test-client' }),
      { wrapper }
    )

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
})
