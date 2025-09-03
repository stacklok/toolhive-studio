import { screen, waitFor } from '@testing-library/react'
import { expect, it, beforeEach } from 'vitest'
import { CardMcpServer } from '../card-mcp-server'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import userEvent from '@testing-library/user-event'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'

let capturedCreateWorkloadPayload: unknown = null

const router = createTestRouter(() => (
  <CardMcpServer
    name="test-server"
    status="running"
    statusContext={undefined}
    url=""
    transport="http"
    onEdit={() => {}}
  />
))

beforeEach(() => {
  router.navigate({ to: '/' })

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
    expect(screen.getByText('test-server')).toBeVisible()
  })

  const user = userEvent.setup()
  const menuButton = screen.getByRole('button', { name: /more/i })
  await user.click(menuButton)

  const logsMenuItem = screen.getByRole('menuitem', { name: /logs/i })
  await user.click(logsMenuItem)

  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/logs/test-server')
  })
})

it('shows "Copy server to a group" menu item and handles the complete workflow', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('test-server')).toBeVisible()
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
      "image": "ghcr.io/test/test-mcp-server:latest",
      "name": "test-server-default",
      "network_isolation": false,
      "secrets": [],
      "transport": "stdio",
      "volumes": [],
    }
  `)
})
