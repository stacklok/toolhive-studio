import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Route as GroupGroupNameRouteImport } from '@/routes/group.$groupName'
import { createFileRouteTestRouter } from '@/common/test/create-file-route-test-router'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'

describe('Group route – disabled state marking', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  function renderGroup(initialPath: string) {
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
    return router
  }

  it('adds data-is-in-disabled-group to cards when group has no registered clients', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [{ name: 'research', registered_clients: [] }],
        })
      )
    )

    renderGroup('/group/research')

    // Wait for a known workload name from mocks to appear
    await waitFor(() => expect(screen.getByText('fetch')).toBeVisible())

    const cards = document.querySelectorAll('[data-slot="card"]')
    expect(cards.length).toBeGreaterThan(0)
    cards.forEach((card) => {
      expect(card).toHaveAttribute('data-is-in-disabled-group', 'true')
    })
  })

  it('does not add the attribute when group has registered clients', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [{ name: 'research', registered_clients: ['vscode'] }],
        })
      )
    )

    renderGroup('/group/research')

    await waitFor(() => expect(screen.getByText('fetch')).toBeVisible())
    // Wait until the disabled attribute is cleared after groups data loads
    await waitFor(() => {
      const anyDisabled = document.querySelector(
        '[data-slot="card"][data-is-in-disabled-group="true"]'
      )
      expect(anyDisabled).toBeNull()
    })

    const cards = document.querySelectorAll('[data-slot="card"]')
    expect(cards.length).toBeGreaterThan(0)
    cards.forEach((card) => {
      expect(card).not.toHaveAttribute('data-is-in-disabled-group')
    })
  })
})
