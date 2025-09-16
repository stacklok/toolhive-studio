import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { recordRequests } from '@/common/mocks/node'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { Route as GroupGroupNameRouteImport } from '@/routes/group.$groupName'
import { createFileRouteTestRouter } from '@/common/test/create-file-route-test-router'

describe('Group route delete group from empty state', () => {
  beforeEach(() => {
    // Ensure clean QueryClient and mocks per test
  })

  it('shows the delete option and deletes an empty group', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const router = createFileRouteTestRouter(
      GroupGroupNameRouteImport,
      '/group/$groupName',
      // Use a group with zero workloads per mocks
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

    // We are in the empty state; ensure empty-state title appears
    await screen.findByText(/add your first mcp server/i)

    const rec = recordRequests()

    // The options button must be available even in empty state
    await userEvent.click(
      await screen.findByRole('button', { name: /options/i })
    )
    await userEvent.click(
      await screen.findByRole('menuitem', { name: /delete group/i })
    )

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText('Delete group')).toBeVisible()
    })
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    // Menu should close and API should be called with with-workloads=true
    await waitFor(() => {
      const del = rec.recordedRequests.find(
        (r) =>
          r.method === 'DELETE' && r.pathname === '/api/v1beta/groups/archive'
      )
      expect(del).toBeTruthy()
      expect(del?.search).toMatchObject({ 'with-workloads': 'true' })
    })

    // Navigates back to default group after deletion
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/group/default')
    })
  })
})
