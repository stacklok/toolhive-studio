import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/common/mocks/node'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { Route as GroupGroupNameRouteImport } from '@/routes/group.$groupName'
import { createFileRouteTestRouter } from '@/common/test/create-file-route-test-router'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'

describe('Group route – disabled UI', () => {
  beforeEach(() => {
    // no-op; handlers are set per test
  })

  function renderGroup(initialPath: string, queryClient: QueryClient) {
    const router = createFileRouteTestRouter(
      GroupGroupNameRouteImport,
      '/group/$groupName',
      initialPath,
      queryClient
    )
    render(
      <ConfirmProvider>
        <PromptProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </PromptProvider>
      </ConfirmProvider>
    )
  }

  it('shows cards at 50% opacity and grayscale, and hides action buttons when group is disabled', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [{ name: 'research', registered_clients: [] }],
        })
      )
    )

    renderGroup('/group/research', queryClient)

    await waitFor(() => expect(screen.getByText('fetch')).toBeVisible())

    const cards = document.querySelectorAll('[data-slot="card"]')
    expect(cards.length).toBeGreaterThan(0)
    cards.forEach((card) => {
      expect(card).toHaveClass('opacity-50')
      expect(card).toHaveClass('grayscale')
    })

    expect(
      screen.queryByRole('button', { name: /add an mcp server/i })
    ).toBeNull()
    expect(screen.queryByRole('button', { name: /manage clients/i })).toBeNull()
  })

  it('restores normal styling and shows action buttons when group is enabled', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [{ name: 'research', registered_clients: ['vscode'] }],
        })
      )
    )

    renderGroup('/group/research', queryClient)

    await waitFor(() => expect(screen.getByText('fetch')).toBeVisible())
    await waitFor(() => {
      const anyDisabled = document.querySelector(
        '[data-slot="card"].opacity-50'
      )
      expect(anyDisabled).toBeNull()
    })

    const cards = document.querySelectorAll('[data-slot="card"]')
    expect(cards.length).toBeGreaterThan(0)
    cards.forEach((card) => {
      expect(card).not.toHaveClass('opacity-50')
      expect(card).not.toHaveClass('grayscale')
    })

    expect(
      screen.getByRole('button', { name: /add an mcp server/i })
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: /manage clients/i })
    ).toBeVisible()
  })
})
