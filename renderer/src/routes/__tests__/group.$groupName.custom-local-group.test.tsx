import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { recordRequests, server as mswServer } from '@/common/mocks/node'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { Route as GroupGroupNameRouteImport } from '@/routes/group.$groupName'
import { createFileRouteTestRouter } from '@/common/test/create-file-route-test-router'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'

// Auto-open the local custom MCP dialog on route render to avoid UI pointer issues
vi.mock('@/features/mcp-servers/components/dropdown-menu-run-mcp-server', () => ({
  DropdownMenuRunMcpServer: ({ openRunCommandDialog }: { openRunCommandDialog: (s: { local: boolean; remote: boolean }) => void }) => {
    useEffect(() => {
      openRunCommandDialog({ local: true, remote: false })
    }, [openRunCommandDialog])
    return null
  },
}))

describe('Group route - custom local MCP defaults to current group', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens the custom local MCP dialog with the current group preselected', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    recordRequests()

    // Provide groups including the target group
    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({ groups: [{ name: 'default' }, { name: 'research' }] })
      )
    )

    const router = createFileRouteTestRouter(
      GroupGroupNameRouteImport,
      '/group/$groupName',
      '/group/research',
      queryClient
    )

    render(
      <PromptProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </PromptProvider>
    )

    // Open the add menu and choose Custom MCP server
    // Dialog should open and Group should be preselected to research
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    const groupCombobox = await screen.findByRole('combobox', { name: 'Group' })
    await userEvent.click(groupCombobox)
    const selected = await screen.findByRole('option', { name: 'research' })
    expect(selected).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps group in sync when navigating between groups before opening the dialog', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    recordRequests()

    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({ groups: [{ name: 'default' }, { name: 'research' }] })
      )
    )

    const router = createFileRouteTestRouter(
      GroupGroupNameRouteImport,
      '/group/$groupName',
      '/group/default',
      queryClient
    )

    render(
      <PromptProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </PromptProvider>
    )

    // Navigate to another group before opening the dialog
    await act(async () => {
      await router.navigate({ to: '/group/research' })
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/group/research')
    })

    // Open the add menu and choose Custom MCP server
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    const groupCombobox = await screen.findByRole('combobox', { name: 'Group' })
    await userEvent.click(groupCombobox)
    const selected = await screen.findByRole('option', { name: 'research' })
    expect(selected).toHaveAttribute('aria-selected', 'true')
  })

  it('preselects current group even when groups fetch resolves slightly later', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    recordRequests()

    // Delay the groups response a tiny bit to simulate async arrival
    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/groups'), async () => {
        await new Promise((r) => setTimeout(r, 2))
        return HttpResponse.json({
          groups: [{ name: 'default' }, { name: 'research' }],
        })
      })
    )

    const router = createFileRouteTestRouter(
      GroupGroupNameRouteImport,
      '/group/$groupName',
      '/group/research',
      queryClient
    )

    render(
      <PromptProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </PromptProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    const groupCombobox = await screen.findByRole('combobox', { name: 'Group' })
    await userEvent.click(groupCombobox)
    const selected = await screen.findByRole('option', { name: 'research' })
    expect(selected).toHaveAttribute('aria-selected', 'true')
  })
})
