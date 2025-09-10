import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
  createRootRouteWithContext,
  Outlet,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { recordRequests } from '@/common/mocks/node'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { Route as GroupGroupNameRouteImport } from '@/routes/group.$groupName'
import { toast } from 'sonner'

describe('Group route delete group confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens a confirmation modal with proper title and description and closes on Delete', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const rec = recordRequests()

    const rootRoute = createRootRouteWithContext<{
      queryClient: QueryClient
    }>()({
      component: Outlet,
      errorComponent: ({ error }) => <div>{String(error)}</div>,
    })
    const GroupRoute = GroupGroupNameRouteImport.update({
      id: '/group/$groupName',
      path: '/group/$groupName',
      getParentRoute: () => rootRoute,
    } as unknown as Parameters<typeof GroupGroupNameRouteImport.update>[0])
    const router = createRouter({
      routeTree: rootRoute.addChildren([GroupRoute]),
      context: { queryClient },
      history: createMemoryHistory({ initialEntries: ['/group/research'] }),
    })

    render(
      <ConfirmProvider>
        <PromptProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </PromptProvider>
      </ConfirmProvider>
    )

    const manageClientsButton = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    const actionsContainer = manageClientsButton.closest('div') as HTMLElement
    const optionsButton = within(actionsContainer).getByRole('button', {
      name: /options/i,
    })

    await userEvent.click(optionsButton)
    await userEvent.click(
      await screen.findByRole('menuitem', { name: /delete group/i })
    )

    // Expect the confirmation modal to appear with title and description
    await waitFor(() => {
      expect(screen.getByText('Delete group')).toBeVisible()
    })
    expect(
      screen.getByText(
        'Deleting this group will permanently erase all it’s servers. Are you sure you want to proceed? This action cannot be undone.'
      )
    ).toBeVisible()

    // Click Delete and expect the dialog to close
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByText('Delete group')).not.toBeInTheDocument()
    })

    // Assert DELETE /api/v1beta/groups/research?with-workloads=true was called
    await waitFor(() => {
      const del = rec.recordedRequests.find(
        (r) =>
          r.method === 'DELETE' && r.pathname === '/api/v1beta/groups/research'
      )
      expect(del).toBeTruthy()
      expect(del?.search).toMatchObject({ 'with-workloads': 'true' })
    })

    // And navigated to default group
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/group/default')
    })
  })

  it('does not call the API when user cancels', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const rec = recordRequests()

    const rootRoute = createRootRouteWithContext<{
      queryClient: QueryClient
    }>()({
      component: Outlet,
      errorComponent: ({ error }) => <div>{String(error)}</div>,
    })
    const GroupRoute = GroupGroupNameRouteImport.update({
      id: '/group/$groupName',
      path: '/group/$groupName',
      getParentRoute: () => rootRoute,
    } as unknown as Parameters<typeof GroupGroupNameRouteImport.update>[0])
    const router = createRouter({
      routeTree: rootRoute.addChildren([GroupRoute]),
      context: { queryClient },
      history: createMemoryHistory({ initialEntries: ['/group/research'] }),
    })

    render(
      <ConfirmProvider>
        <PromptProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </PromptProvider>
      </ConfirmProvider>
    )

    const manageClientsButton = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    const actionsContainer = manageClientsButton.closest('div') as HTMLElement
    const optionsButton = within(actionsContainer).getByRole('button', {
      name: /options/i,
    })

    await userEvent.click(optionsButton)
    await userEvent.click(
      await screen.findByRole('menuitem', { name: /delete group/i })
    )

    await waitFor(() => {
      expect(screen.getByText('Delete group')).toBeVisible()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    // Small tick for any async side-effects
    await new Promise((r) => setTimeout(r, 10))

    // Assert no DELETE request for group deletion was made and no navigation
    expect(
      rec.recordedRequests.find(
        (r) =>
          r.method === 'DELETE' && r.pathname.startsWith('/api/v1beta/groups/')
      )
    ).toBeUndefined()
    expect(router.state.location.pathname).toBe('/group/research')
  })

  it('shows a toast error and no modal when trying to delete the default group', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const rec = recordRequests()

    const rootRoute = createRootRouteWithContext<{
      queryClient: QueryClient
    }>()({
      component: Outlet,
      errorComponent: ({ error }) => <div>{String(error)}</div>,
    })
    const GroupRoute = GroupGroupNameRouteImport.update({
      id: '/group/$groupName',
      path: '/group/$groupName',
      getParentRoute: () => rootRoute,
    } as unknown as Parameters<typeof GroupGroupNameRouteImport.update>[0])
    const router = createRouter({
      routeTree: rootRoute.addChildren([GroupRoute]),
      context: { queryClient },
      history: createMemoryHistory({ initialEntries: ['/group/default'] }),
    })

    render(
      <ConfirmProvider>
        <PromptProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </PromptProvider>
      </ConfirmProvider>
    )

    const manageClientsButton = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    const actionsContainer = manageClientsButton.closest('div') as HTMLElement
    const optionsButton = within(actionsContainer).getByRole('button', {
      name: /options/i,
    })

    await userEvent.click(optionsButton)
    await userEvent.click(
      await screen.findByRole('menuitem', { name: /delete group/i })
    )

    // Should not show the confirmation modal
    expect(screen.queryByText('Delete group')).toBeNull()

    // Should show a toast error
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'The default group cannot be deleted'
      )
    })

    // No delete API request
    expect(
      rec.recordedRequests.find(
        (r) =>
          r.method === 'DELETE' && r.pathname.startsWith('/api/v1beta/groups/')
      )
    ).toBeUndefined()

    // No navigation
    expect(router.state.location.pathname).toBe('/group/default')
  })
})
