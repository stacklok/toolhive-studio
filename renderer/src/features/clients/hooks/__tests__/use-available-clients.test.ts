import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAvailableClients } from '../use-available-clients'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'

describe('useAvailableClients', () => {
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

  it('returns installed clients from discovery API', async () => {
    // Mock the discovery clients endpoint
    server.use(
      http.get(mswEndpoint('/api/v1beta/discovery/clients'), () => {
        return HttpResponse.json({
          clients: [
            { client_type: 'vscode', installed: true, registered: false },
            { client_type: 'cursor', installed: true, registered: true },
            { client_type: 'claude-code', installed: false, registered: false },
            { client_type: 'cline', installed: true, registered: false },
          ],
        })
      })
    )

    const { result } = renderHook(() => useAvailableClients(), { wrapper })

    // Wait for the query to resolve
    await waitFor(() => {
      expect(result.current.installedClients).toHaveLength(3)
    })

    expect(result.current.installedClients.map((c) => c.client_type)).toEqual([
      'vscode',
      'cursor',
      'cline',
    ])
  })

  it('provides correct display names for clients', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/discovery/clients'), () => {
        return HttpResponse.json({
          clients: [
            { client_type: 'vscode', installed: true, registered: false },
            { client_type: 'cursor', installed: true, registered: false },
          ],
        })
      })
    )

    const { result } = renderHook(() => useAvailableClients(), { wrapper })

    await waitFor(() => {
      expect(result.current.installedClients).toHaveLength(2)
    })

    expect(result.current.getClientDisplayName('vscode')).toBe(
      'VS Code - Copilot'
    )
    expect(result.current.getClientDisplayName('cursor')).toBe('Cursor')
    expect(result.current.getClientDisplayName('unknown-client')).toBe(
      'unknown-client'
    )
  })

  it('provides correct field names for clients', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/discovery/clients'), () => {
        return HttpResponse.json({
          clients: [
            { client_type: 'vscode', installed: true, registered: false },
            { client_type: 'claude-code', installed: true, registered: false },
          ],
        })
      })
    )

    const { result } = renderHook(() => useAvailableClients(), { wrapper })

    await waitFor(() => {
      expect(result.current.installedClients).toHaveLength(2)
    })

    expect(result.current.getClientFieldName('vscode')).toBe('enableVscode')
    expect(result.current.getClientFieldName('claude-code')).toBe(
      'enableClaudeCode'
    )
  })
})
