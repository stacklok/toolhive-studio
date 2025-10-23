import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ManageClientsButton } from '../manage-clients-button'
import { server, recordRequests } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { mswEndpoint } from '@/common/mocks/customHandlers'

vi.mock('@/common/hooks/use-feature-flag')
vi.mock('@/features/meta-mcp/hooks/use-mcp-optimizer-clients')

const { useFeatureFlag } = await import('@/common/hooks/use-feature-flag')
const { useMcpOptimizerClients } = await import(
  '@/features/meta-mcp/hooks/use-mcp-optimizer-clients'
)

// Use the shared request recorder from mocks/node.ts for consistency

describe('ManageClientsButton – BDD flows', () => {
  let queryClient: QueryClient
  const saveGroupClientsMock = vi.fn()

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    vi.mocked(useMcpOptimizerClients).mockReturnValue({
      saveGroupClients: saveGroupClientsMock,
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
          groups: [
            { name: 'default', registered_clients: [] },
            { name: '__mcp-optimizer__', registered_clients: [] },
          ],
        })
      ),
      http.get(mswEndpoint('/api/v1beta/clients'), () => HttpResponse.json([])),
      http.post(mswEndpoint('/api/v1beta/clients/register'), () =>
        HttpResponse.json([])
      )
    )

    const rec = recordRequests()

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )
    await user.click(await screen.findByRole('switch', { name: 'vscode' }))
    await user.click(await screen.findByRole('switch', { name: /cursor/i }))
    await user.click(await screen.findByRole('button', { name: /save/i }))

    await waitFor(() =>
      expect(
        rec.recordedRequests.filter(
          (r) =>
            r.pathname === '/api/v1beta/clients' &&
            (r.method === 'POST' || r.method === 'DELETE')
        )
      ).toHaveLength(2)
    )
    const snapshot = rec.recordedRequests
      .filter(
        (r) =>
          r.pathname === '/api/v1beta/clients' &&
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
    // no-op: global recorder persists; we reset via recordRequests() per test
  })

  it('enables a single client when none are enabled (clients API returns null)', async () => {
    // Given: no clients are registered in the group
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            { name: 'default', registered_clients: [] },
            { name: '__mcp-optimizer__', registered_clients: [] },
          ],
        })
      ),
      // Simulate backend returning null for current clients list
      http.get(mswEndpoint('/api/v1beta/clients'), () =>
        HttpResponse.json(null)
      ),
      http.post(mswEndpoint('/api/v1beta/clients/register'), () =>
        HttpResponse.json([])
      )
    )

    const rec = recordRequests()

    // When: the user enables only VS Code and saves
    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )
    await user.click(await screen.findByRole('switch', { name: 'vscode' }))
    await user.click(await screen.findByRole('button', { name: /save/i }))

    // Then: exactly one POST registration should be sent
    await waitFor(() =>
      expect(
        rec.recordedRequests.filter(
          (r) =>
            r.pathname === '/api/v1beta/clients' &&
            (r.method === 'POST' || r.method === 'DELETE')
        )
      ).toHaveLength(1)
    )
    const snapshot = rec.recordedRequests
      .filter(
        (r) =>
          r.pathname === '/api/v1beta/clients' &&
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
    ])
    // no-op
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
            {
              name: '__mcp-optimizer__',
              registered_clients: [],
            },
          ],
        })
      ),
      http.post(mswEndpoint('/api/v1beta/clients/register'), () =>
        HttpResponse.json([])
      )
    )

    const rec = recordRequests()

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )
    await user.click(await screen.findByRole('switch', { name: 'cursor' }))
    await user.click(await screen.findByRole('switch', { name: 'claude-code' }))
    await user.click(await screen.findByRole('button', { name: /save/i }))

    await waitFor(() =>
      expect(
        rec.recordedRequests.filter(
          (r) =>
            r.method === 'DELETE' &&
            r.pathname.startsWith('/api/v1beta/clients')
        )
      ).toHaveLength(2)
    )
    const snapshot = rec.recordedRequests
      .filter(
        (r) =>
          r.method === 'DELETE' && r.pathname.startsWith('/api/v1beta/clients')
      )
      .map(({ method, pathname }) => ({ method, path: pathname }))
    expect(snapshot).toEqual([
      { method: 'DELETE', path: '/api/v1beta/clients/cursor/groups/default' },
      {
        method: 'DELETE',
        path: '/api/v1beta/clients/claude-code/groups/default',
      },
    ])
    // no-op
  })

  it('handles mixed enable and disable changes', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            { name: 'default', registered_clients: ['vscode', 'cursor'] },
            { name: '__mcp-optimizer__', registered_clients: [] },
          ],
        })
      ),
      http.get(mswEndpoint('/api/v1beta/clients'), () =>
        HttpResponse.json([
          { name: { name: 'vscode' }, groups: ['default'] },
          { name: { name: 'cursor' }, groups: ['default'] },
          { name: { name: 'claude-code' }, groups: [] },
        ])
      ),
      http.post(mswEndpoint('/api/v1beta/clients/register'), () =>
        HttpResponse.json([])
      )
    )

    const rec = recordRequests()

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )
    await user.click(await screen.findByRole('switch', { name: 'vscode' }))
    await user.click(await screen.findByRole('switch', { name: 'claude-code' }))
    await user.click(await screen.findByRole('button', { name: /save/i }))

    await waitFor(() => {
      const calls = rec.recordedRequests
        .filter((r) => r.pathname.startsWith('/api/v1beta/clients'))
        .map((r) => r.method)
      expect(calls.includes('DELETE')).toBe(true)
      expect(calls.includes('POST')).toBe(true)
    })
    const snapshot = rec.recordedRequests
      .filter(
        (r) =>
          r.pathname.startsWith('/api/v1beta/clients') &&
          (r.method === 'POST' || r.method === 'DELETE') &&
          r.pathname !== '/api/v1beta/clients/register'
      )
      .map(({ method, pathname, payload }) => ({
        method,
        path: pathname,
        body: payload,
      }))
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
    // no-op
  })

  it('makes no calls when nothing changes', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            { name: 'default', registered_clients: ['vscode', 'cursor'] },
            {
              name: '__mcp-optimizer__',
              registered_clients: ['vscode', 'cursor'],
            },
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

    const rec = recordRequests()

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )
    await user.click(await screen.findByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(
        rec.recordedRequests.filter(
          (r) =>
            r.pathname === '/api/v1beta/clients' &&
            (r.method === 'POST' || r.method === 'DELETE')
        )
      ).toEqual([])
    })
  })

  it('cancels without issuing API calls', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [{ name: 'default', registered_clients: [] }],
        })
      )
    )

    const rec = recordRequests()

    const user = userEvent.setup()
    renderWithProviders({ groupName: 'default' })
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )
    await user.click(await screen.findByRole('button', { name: /cancel/i }))

    await new Promise((r) => setTimeout(r, 10))
    expect(
      rec.recordedRequests.filter(
        (r) =>
          r.pathname.startsWith('/api/v1beta/clients') &&
          (r.method === 'POST' || r.method === 'DELETE')
      )
    ).toEqual([])
    // no-op
  })

  it("doesn't sync client when meta optimizer is disabled", async () => {
    vi.mocked(useFeatureFlag).mockReturnValue(false)

    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [],
        })
      ),
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            { name: 'default', registered_clients: ['vscode', 'cursor'] },
            { name: '__mcp-optimizer__', registered_clients: [] },
          ],
        })
      ),
      http.get(mswEndpoint('/api/v1beta/clients'), () =>
        HttpResponse.json([
          { name: { name: 'vscode' }, groups: ['default'] },
          { name: { name: 'cursor' }, groups: ['default'] },
          { name: { name: 'claude-code' }, groups: [] },
        ])
      ),
      http.post(mswEndpoint('/api/v1beta/clients/register'), () =>
        HttpResponse.json([])
      )
    )

    renderWithProviders({ groupName: 'default' })
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: /manage clients/i })
    )
    await user.click(await screen.findByRole('switch', { name: 'vscode' }))
    await user.click(await screen.findByRole('switch', { name: 'claude-code' }))
    await user.click(await screen.findByRole('button', { name: /save/i }))

    expect(saveGroupClientsMock).not.toHaveBeenCalled()
  })
})
