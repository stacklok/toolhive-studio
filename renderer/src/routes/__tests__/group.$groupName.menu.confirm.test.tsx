import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { recordRequests } from '@/common/mocks/node'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { Route as GroupGroupNameRouteImport } from '@/routes/group.$groupName'
import { toast } from 'sonner'
import { createFileRouteTestRouter } from '@/common/test/create-file-route-test-router'

describe('Group route delete group confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens a confirmation modal with proper title and description and closes on Delete', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    recordRequests()

    const router = createFileRouteTestRouter(
      GroupGroupNameRouteImport,
      '/group/$groupName',
      '/group/research',
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
          r.method === 'DELETE' && r.pathname === '/api/v1beta/groups/research'
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

    const router = createFileRouteTestRouter(
      GroupGroupNameRouteImport,
      '/group/$groupName',
      '/group/research',
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

    const router = createFileRouteTestRouter(
      GroupGroupNameRouteImport,
      '/group/$groupName',
      '/group/default',
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
