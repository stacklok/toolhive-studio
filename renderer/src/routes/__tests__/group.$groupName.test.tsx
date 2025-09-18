import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { recordRequests, server } from '@/common/mocks/node'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { Route as GroupGroupNameRouteImport } from '@/routes/group.$groupName'
import { toast } from 'sonner'
import { createFileRouteTestRouter } from '@/common/test/create-file-route-test-router'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'

describe('Group route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    return router
  }

  describe('disabled UI state', () => {
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
      expect(
        screen.queryByRole('button', { name: /manage clients/i })
      ).toBeNull()
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

  describe('delete group confirmation', () => {
    it('opens a confirmation modal and deletes on confirm', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      recordRequests()

      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({
            groups: [{ name: 'research', registered_clients: ['vscode'] }],
          })
        )
      )

      const router = renderGroup('/group/research', queryClient)

      const manageClientsButton = await screen.findByRole('button', {
        name: /manage clients/i,
      })
      const actionsContainer = manageClientsButton.closest('div') as HTMLElement
      const optionsButton = within(actionsContainer).getByRole('button', {
        name: /options/i,
      })

      const recFlow = recordRequests()

      await userEvent.click(optionsButton)
      await userEvent.click(
        await screen.findByRole('menuitem', { name: /delete group/i })
      )

      await waitFor(() => {
        expect(screen.getByText('Delete group')).toBeVisible()
      })
      expect(
        screen.getByText(
          'Deleting this group will permanently erase all its servers. Are you sure you want to proceed? This action cannot be undone.'
        )
      ).toBeVisible()

      await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(screen.queryByText('Delete group')).not.toBeInTheDocument()
      })

      await waitFor(() => {
        const del = recFlow.recordedRequests.find(
          (r) =>
            r.method === 'DELETE' &&
            r.pathname === '/api/v1beta/groups/research'
        )
        expect(del).toBeTruthy()
        expect(del?.search).toMatchObject({ 'with-workloads': 'true' })
      })
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/group/default')
      })
    })

    it('does not call the API when user cancels', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      recordRequests()

      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({
            groups: [{ name: 'research', registered_clients: ['vscode'] }],
          })
        )
      )

      const router = renderGroup('/group/research', queryClient)

      const manageClientsButton = await screen.findByRole('button', {
        name: /manage clients/i,
      })
      const actionsContainer = manageClientsButton.closest('div') as HTMLElement
      const optionsButton = within(actionsContainer).getByRole('button', {
        name: /options/i,
      })

      const recFlow = recordRequests()

      await userEvent.click(optionsButton)
      await userEvent.click(
        await screen.findByRole('menuitem', { name: /delete group/i })
      )

      await waitFor(() => {
        expect(screen.getByText('Delete group')).toBeVisible()
      })

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      await new Promise((r) => setTimeout(r, 10))

      expect(recFlow.recordedRequests).toEqual([])
      expect(router.state.location.pathname).toBe('/group/research')
    })

    it('shows a toast error and no modal when trying to delete the default group', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      recordRequests()

      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({
            groups: [{ name: 'default', registered_clients: ['vscode'] }],
          })
        )
      )

      const router = renderGroup('/group/default', queryClient)

      const manageClientsButton = await screen.findByRole('button', {
        name: /manage clients/i,
      })
      const actionsContainer = manageClientsButton.closest('div') as HTMLElement
      const optionsButton = within(actionsContainer).getByRole('button', {
        name: /options/i,
      })

      const recFlow = recordRequests()

      await userEvent.click(optionsButton)
      await userEvent.click(
        await screen.findByRole('menuitem', { name: /delete group/i })
      )

      expect(screen.queryByText('Delete group')).toBeNull()
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'The default group cannot be deleted'
        )
      })
      expect(recFlow.recordedRequests).toEqual([])
      expect(router.state.location.pathname).toBe('/group/default')
    })

    it('shows delete option and deletes an empty group (empty state)', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      recordRequests()

      const router = createFileRouteTestRouter(
        GroupGroupNameRouteImport,
        '/group/$groupName',
        '/group/archive',
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

      await screen.findByText(/add your first mcp server/i)

      const recFlow = recordRequests()

      await userEvent.click(
        await screen.findByRole('button', { name: /options/i })
      )
      await userEvent.click(
        await screen.findByRole('menuitem', { name: /delete group/i })
      )

      await waitFor(() => {
        expect(screen.getByText('Delete group')).toBeVisible()
      })
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        const del = recFlow.recordedRequests.find(
          (r) =>
            r.method === 'DELETE' && r.pathname === '/api/v1beta/groups/archive'
        )
        expect(del).toBeTruthy()
        expect(del?.search).toMatchObject({ 'with-workloads': 'true' })
      })
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/group/default')
      })
    })
  })
})
