import { screen, waitFor } from '@testing-library/react'
import { expect, it, beforeEach } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import userEvent from '@testing-library/user-event'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'
import {
  createRootRoute,
  createRoute,
  Outlet,
  Router,
} from '@tanstack/react-router'
import { createMemoryHistory } from '@tanstack/react-router'
import { CardMcpServer } from '../card-mcp-server/index'

let capturedCreateWorkloadPayload: unknown = null

function createCardMcpServerTestRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  })

  const groupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/group/$groupName',
    component: () => (
      <CardMcpServer
        name="postgres-db"
        status="running"
        statusContext={undefined}
        url="http://localhost:8080"
        transport="http"
      />
    ),
  })

  const router = new Router({
    routeTree: rootRoute.addChildren([groupRoute]),
    history: createMemoryHistory({ initialEntries: ['/group/default'] }),
  })

  return router
}

const router = createCardMcpServerTestRouter() as unknown as ReturnType<
  typeof createTestRouter
>

beforeEach(() => {
  router.navigate({ to: '/group/$groupName', params: { groupName: 'default' } })

  // Reset captured payload
  capturedCreateWorkloadPayload = null

  // Override the existing MSW handler to capture the payload
  server.use(
    http.post(mswEndpoint('/api/v1beta/workloads'), async ({ request }) => {
      const payload = await request.json()
      capturedCreateWorkloadPayload = payload
      return HttpResponse.json({ name: 'test-server-copied' })
    })
  )
})

it('navigates to logs page when logs menu item is clicked', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const user = userEvent.setup()
  const menuButton = screen.getByRole('button', { name: /more/i })
  await user.click(menuButton)

  const logsMenuItem = screen.getByRole('menuitem', { name: /logs/i })
  await user.click(logsMenuItem)

  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/logs/postgres-db')
  })
})

it('shows "Copy server to a group" menu item and handles the complete workflow', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const user = userEvent.setup()

  const dropdownTrigger = screen.getByRole('button', { name: /more options/i })
  await user.click(dropdownTrigger)

  const addToGroupMenuItem = screen.queryByRole('menuitem', {
    name: /copy server to a group/i,
  })
  expect(addToGroupMenuItem).toBeInTheDocument()

  await user.click(addToGroupMenuItem!)

  await waitFor(() => {
    expect(screen.getByText('Copy server to a group')).toBeVisible()
  })

  expect(screen.getByText('Select destination group')).toBeVisible()

  const selectTrigger = screen.getByRole('combobox')
  await user.click(selectTrigger)

  const groupOption = screen.getByRole('option', { name: 'default' })
  await user.click(groupOption)

  const submitButton = screen.getByRole('button', { name: 'OK' })
  await user.click(submitButton)

  // Wait for the mutation to complete and verify the payload
  await waitFor(() => {
    expect(capturedCreateWorkloadPayload).toBeTruthy()
  })

  // Verify that the createWorkload was called with the correct payload
  expect(capturedCreateWorkloadPayload).toMatchInlineSnapshot(`
    {
      "cmd_arguments": [],
      "env_vars": {},
      "group": "default",
      "host": "127.0.0.1",
      "image": "ghcr.io/postgres/postgres-mcp-server:latest",
      "name": "postgres-db-default",
      "network_isolation": false,
      "secrets": [],
      "target_port": 28135,
      "transport": "stdio",
      "volumes": [],
    }
  `)
})
