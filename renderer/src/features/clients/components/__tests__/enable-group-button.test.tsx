import { describe, it, expect, beforeEach } from 'vitest'
import { Suspense } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server, recordRequests } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { EnableGroupButton } from '../enable-group-button'
import { mswEndpoint } from '@/common/mocks/customHandlers'

describe('EnableGroupButton – flows', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  const renderWithProviders = (props: { groupName: string }) =>
    render(
      <QueryClientProvider client={queryClient}>
        <PromptProvider>
          <Suspense fallback={null}>
            <EnableGroupButton {...props} />
          </Suspense>
        </PromptProvider>
      </QueryClientProvider>
    )

  it('enables multiple clients for a disabled group', async () => {
    // Group disabled initially
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [{ name: 'default', registered_clients: [] }],
        })
      ),
      http.get(mswEndpoint('/api/v1beta/clients'), () => HttpResponse.json([]))
    )

    const rec = recordRequests()

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /enable group/i })
    )

    await user.click(await screen.findByRole('switch', { name: 'vscode' }))
    await user.click(await screen.findByRole('switch', { name: /cursor/i }))
    await user.click(await screen.findByRole('button', { name: /enable/i }))

    await waitFor(() =>
      expect(
        rec.recordedRequests.filter(
          (r) =>
            r.pathname.startsWith('/api/v1beta/clients') &&
            (r.method === 'POST' || r.method === 'DELETE')
        )
      ).toHaveLength(2)
    )
    const snapshot = rec.recordedRequests
      .filter(
        (r) =>
          r.pathname.startsWith('/api/v1beta/clients') &&
          (r.method === 'POST' || r.method === 'DELETE')
      )
      .map(({ method, pathname, payload }) => ({
        method,
        path: pathname,
        body: payload,
      }))
    expect(snapshot).toEqual([
      {
        method: 'POST',
        path: '/api/v1beta/clients',
        body: { name: 'vscode', groups: ['default'] },
      },
      {
        method: 'POST',
        path: '/api/v1beta/clients',
        body: { name: 'cursor', groups: ['default'] },
      },
    ])
  })
})
