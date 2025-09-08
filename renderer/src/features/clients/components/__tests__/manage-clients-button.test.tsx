import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ManageClientsButton } from '../manage-clients-button'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'

// Drive flows by controlling the returned values of the prompt
const mockPromptForm = vi.fn()
vi.mock('@/common/hooks/use-prompt', () => ({
  usePrompt: () => mockPromptForm,
}))

type Recorded = { method: string; url: string; path: string; body?: unknown }
function startRecording(filter?: (url: string, method: string) => boolean) {
  const records: Recorded[] = []
  const onStart = async ({ request }: { request: Request }) => {
    const method = request.method
    const url = request.url
    const path = new URL(url).pathname
    if (filter && !filter(url, method)) return

    let body: unknown
    try {
      if (method !== 'GET' && method !== 'DELETE') {
        const text = await request.clone().text()
        body = text
          ? (() => {
              try {
                return JSON.parse(text)
              } catch {
                return text
              }
            })()
          : undefined
      }
    } catch {
      // ignore
    }
    records.push({ method, url, path, body })
  }
  // @ts-expect-error runtime event exists in msw v2
  server.events.on('request:start', onStart)
  return {
    get: () => records,
    stop: () => {
      // @ts-expect-error runtime event exists in msw v2
      server.events.removeListener('request:start', onStart)
    },
  }
}

describe('ManageClientsButton – BDD flows', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const renderWithProviders = (props: { groupName: string }) =>
    render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          <ManageClientsButton {...props} />
        </Suspense>
      </QueryClientProvider>
    )

  it('enables multiple clients for a group', async () => {
    // Given: the group has no registered clients
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [{ name: 'default', registered_clients: [] }],
        })
      ),
      // And: the clients list returns no prior groups (forces POST writes)
      http.get(mswEndpoint('/api/v1beta/clients'), () => HttpResponse.json([]))
    )

    const rec = startRecording(
      (url, method) =>
        url.includes('/api/v1beta/clients') &&
        (method === 'POST' || method === 'DELETE')
    )

    // And: the user enables VS Code and Cursor
    mockPromptForm.mockImplementation(async (config) => ({
      ...(config.defaultValues as Record<string, boolean>),
      enableVscode: true,
      enableCursor: true,
      enableClaudeCode: false,
    }))

    // When: clicking Manage Clients and saving
    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )

    // Then: two POST registrations go out for the default group
    await waitFor(() => expect(rec.get()).toHaveLength(2))
    const snapshot = rec
      .get()
      .map(({ method, path, body }) => ({ method, path, body }))
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
    rec.stop()
  })

  it('disables clients from a group', async () => {
    // Given: vscode, cursor, claude-code are registered in the group
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: 'default',
              registered_clients: ['vscode', 'cursor', 'claude-code'],
            },
          ],
        })
      )
    )

    const rec = startRecording(
      (url, method) =>
        url.includes('/api/v1beta/clients') &&
        (method === 'POST' || method === 'DELETE')
    )

    // And: keep only VS Code
    mockPromptForm.mockImplementation(async (config) => ({
      ...(config.defaultValues as Record<string, boolean>),
      enableVscode: true,
      enableCursor: false,
      enableClaudeCode: false,
    }))

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )

    // Then: two DELETE calls for cursor and claude-code
    await waitFor(() =>
      expect(rec.get().filter((r) => r.method === 'DELETE')).toHaveLength(2)
    )
    const snapshot = rec
      .get()
      .filter((r) => r.method === 'DELETE')
      .map(({ method, path }) => ({ method, path }))
    expect(snapshot).toEqual([
      { method: 'DELETE', path: '/api/v1beta/clients/cursor/groups/default' },
      {
        method: 'DELETE',
        path: '/api/v1beta/clients/claude-code/groups/default',
      },
    ])
    rec.stop()
  })

  it('handles mixed enable and disable changes', async () => {
    // Given: vscode and cursor are registered, claude-code is not
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            { name: 'default', registered_clients: ['vscode', 'cursor'] },
          ],
        })
      ),
      http.get(mswEndpoint('/api/v1beta/clients'), () =>
        HttpResponse.json([
          { name: { name: 'vscode' }, groups: ['default'] },
          { name: { name: 'cursor' }, groups: ['default'] },
          { name: { name: 'claude-code' }, groups: [] },
        ])
      )
    )

    const rec = startRecording(
      (url, method) =>
        url.includes('/api/v1beta/clients') &&
        (method === 'POST' || method === 'DELETE')
    )

    // And: disable vscode, keep cursor, enable claude-code
    mockPromptForm.mockImplementation(async (config) => ({
      ...(config.defaultValues as Record<string, boolean>),
      enableVscode: false,
      enableCursor: true,
      enableClaudeCode: true,
    }))

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )

    // Then: one DELETE and one POST
    await waitFor(() => {
      const calls = rec.get()
      expect(calls.some((c) => c.method === 'DELETE')).toBe(true)
      expect(calls.some((c) => c.method === 'POST')).toBe(true)
    })
    const snapshot = rec
      .get()
      .map(({ method, path, body }) => ({ method, path, body }))
    expect(snapshot).toEqual([
      {
        method: 'DELETE',
        path: '/api/v1beta/clients/vscode/groups/default',
        body: undefined,
      },
      {
        method: 'POST',
        path: '/api/v1beta/clients',
        body: { name: 'claude-code', groups: ['default'] },
      },
    ])
    rec.stop()
  })

  it('makes no calls when nothing changes', async () => {
    // Given: vscode and cursor are already registered
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            { name: 'default', registered_clients: ['vscode', 'cursor'] },
          ],
        })
      ),
      http.get(mswEndpoint('/api/v1beta/clients'), () =>
        HttpResponse.json([
          { name: { name: 'vscode' }, groups: ['default'] },
          { name: { name: 'cursor' }, groups: ['default'] },
        ])
      )
    )

    const rec = startRecording(
      (url, method) =>
        url.includes('/api/v1beta/clients') &&
        (method === 'POST' || method === 'DELETE')
    )

    // And: the user confirms unchanged values
    mockPromptForm.mockImplementation(async (config) => ({
      ...(config.defaultValues as Record<string, boolean>),
    }))

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )

    // Then: no writes occur
    await new Promise((r) => setTimeout(r, 10))
    expect(rec.get()).toEqual([])
    rec.stop()
  })

  it('cancels without issuing API calls', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [{ name: 'default', registered_clients: [] }],
        })
      )
    )

    const rec = startRecording(
      (url, method) =>
        url.includes('/api/v1beta/clients') &&
        (method === 'POST' || method === 'DELETE')
    )

    mockPromptForm.mockResolvedValue(null)

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )

    await new Promise((r) => setTimeout(r, 10))
    expect(rec.get()).toEqual([])
    rec.stop()
  })
})
