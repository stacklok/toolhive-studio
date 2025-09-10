import { render, screen, within } from '@testing-library/react'
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
import { ConfirmProvider } from '@/common/contexts/confirm/provider'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { Route as GroupGroupNameRouteImport } from '@/routes/group.$groupName'

describe('Group route actions menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock electron APIs used by the group route
    Object.defineProperty(window, 'electronAPI', {
      value: {
        shutdownStore: {
          getLastShutdownServers: vi.fn().mockResolvedValue([]),
          clearShutdownHistory: vi.fn().mockResolvedValue(undefined),
        },
        onServerShutdown: vi.fn().mockReturnValue(() => {}),
      },
      writable: true,
    })
  })

  it('shows a triple-dot dropdown next to Manage Clients with Delete group option', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    // Build a minimal router with only the group route to avoid
    // importing unrelated routes that pull CSS (e.g., chat/katex)
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

    // Wait for the page header to show actions
    const manageClientsButton = await screen.findByRole('button', {
      name: /manage clients/i,
    })

    // Scope the search for the options button to the same actions container
    const actionsContainer = manageClientsButton.closest('div') as HTMLElement
    expect(actionsContainer).toBeTruthy()

    // This is the triple-dot menu trigger similar to server card menu
    // It should live next to the Manage Clients button on this page
    const optionsButton = within(actionsContainer).getByRole('button', {
      name: /options/i,
    })

    // Open the menu and expect the single option "Delete group"
    await userEvent.click(optionsButton)
    const deleteItem = await screen.findByRole('menuitem', {
      name: /delete group/i,
    })
    expect(deleteItem).toBeVisible()
  })
})
