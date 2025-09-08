import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ManageClientsButton } from '../manage-clients-button'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'
import { PromptProvider } from '@/common/contexts/prompt/provider'

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
  server.events.on('request:start', onStart)
  return {
    get: () => records,
    stop: () => {
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
        <PromptProvider>
          <Suspense fallback={null}>
            <ManageClientsButton {...props} />
          </Suspense>
        </PromptProvider>
      </QueryClientProvider>
    )

  it('enables multiple clients for a group', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [{ name: 'default', registered_clients: [] }],
        })
      ),
      http.get(mswEndpoint('/api/v1beta/clients'), () => HttpResponse.json([]))
    )

    const rec = startRecording(
      (url, method) =>
        url.includes('/api/v1beta/clients') &&
        (method === 'POST' || method === 'DELETE')
    )

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )
    await user.click(
      await screen.findByRole('switch', { name: /VS Code - Copilot/i })
    )
    await user.click(await screen.findByRole('switch', { name: /Cursor/i }))
    await user.click(await screen.findByRole('button', { name: /save/i }))

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

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )
    await user.click(await screen.findByRole('switch', { name: /Cursor/i }))
    await user.click(
      await screen.findByRole('switch', { name: /Claude Code/i })
    )
    await user.click(await screen.findByRole('button', { name: /save/i }))

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

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )
    await user.click(
      await screen.findByRole('switch', { name: /VS Code - Copilot/i })
    )
    await user.click(
      await screen.findByRole('switch', { name: /Claude Code/i })
    )
    await user.click(await screen.findByRole('button', { name: /save/i }))

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

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )
    await user.click(await screen.findByRole('button', { name: /save/i }))

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

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )
    await user.click(await screen.findByRole('button', { name: /cancel/i }))

    await new Promise((r) => setTimeout(r, 10))
    expect(rec.get()).toEqual([])
    rec.stop()
  })
})
