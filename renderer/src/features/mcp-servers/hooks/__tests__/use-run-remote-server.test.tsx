import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRunRemoteServer } from '../use-run-remote-server'
import { server as mswServer } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useRunRemoteServer', () => {
  it('uses form data group instead of groupName prop when form data has a group', async () => {
    let apiRequestBody: any = null

    // Mock the API to capture what gets sent
    mswServer.use(
      http.post(mswEndpoint('/api/v1beta/workloads'), async ({ request }) => {
        apiRequestBody = await request.json()
        return HttpResponse.json(
          { name: 'test-server', port: 8080 },
          { status: 201 }
        )
      }),
      http.post(mswEndpoint('/api/v1beta/clients/restart'), () => {
        return HttpResponse.json({ success: true })
      })
    )

    const { result } = renderHook(
      () =>
        useRunRemoteServer({
          pageName: '/test',
          onSecretSuccess: vi.fn(),
          onSecretError: vi.fn(),
          groupName: 'default', // This is the prop
        }),
      { wrapper }
    )

    const formData: FormSchemaRemoteMcp = {
      name: 'test-server',
      url: 'https://api.example.com',
      transport: 'streamable-http',
      auth_type: 'none',
      oauth_config: {
        authorize_url: '',
        callback_port: 8080,
        client_id: '',
        client_secret: undefined,
        issuer: '',
        oauth_params: {},
        scopes: '',
        skip_browser: false,
        token_url: '',
        use_pkce: true,
      },
      envVars: [],
      secrets: [],
      group: 'production', // User selected 'production' in the form
    }

    // Call the mutation
    result.current.installServerMutation(
      { data: formData },
      {
        onSuccess: vi.fn(),
        onError: vi.fn(),
      }
    )

    // Wait for the API call to complete
    await waitFor(() => {
      expect(apiRequestBody).not.toBeNull()
    })

    // The API should receive 'production' (from form data), not 'default' (from prop)
    expect(apiRequestBody.group).toBe('production')
  })
})
