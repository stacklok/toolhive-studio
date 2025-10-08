import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRunRemoteServer } from '../use-run-remote-server'
import { server as mswServer, recordRequests } from '@/common/mocks/node'
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

describe('useRunRemoteServer', () => {
  it('sends the group from form data to the API', async () => {
    const rec = recordRequests()

    mswServer.use(
      http.post(mswEndpoint('/api/v1beta/workloads'), () => {
        return HttpResponse.json({ name: 'test-server', port: 8080 })
      })
    )

    const { result } = renderHook(
      () =>
        useRunRemoteServer({
          pageName: '/test',
          onSecretSuccess: () => {},
          onSecretError: () => {},
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
      group: 'production',
    }

    result.current.installServerMutation({ data: formData })

    await waitFor(() => {
      const workloadRequest = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
      )

      expect(workloadRequest?.payload).toMatchObject({
        group: 'production',
        name: 'test-server',
      })
    })
  })
})
