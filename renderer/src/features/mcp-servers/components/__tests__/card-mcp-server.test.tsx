import { screen, waitFor } from '@testing-library/react'
import { expect, it, beforeEach } from 'vitest'
import { CardMcpServer } from '../card-mcp-server'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import userEvent from '@testing-library/user-event'

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
  // Reset router state
  router.navigate({ to: '/' })
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

it('should show Add server to a group menu item', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('test-server')).toBeVisible()
  })

  const user = userEvent.setup()

  const menuButton = screen.getByRole('button', { name: /more/i })
  await user.click(menuButton)

  const addToGroupMenuItem = screen.queryByRole('menuitem', {
    name: /copy server to a group/i,
  })

  expect(addToGroupMenuItem).not.toBeNull()
  expect(addToGroupMenuItem).toBeVisible()
})

it('shows "Copy server to a group" menu item and handles the complete workflow', async () => {
  renderRoute(router)

  // Wait for the component to render
  await waitFor(() => {
    expect(screen.getByText('test-server')).toBeVisible()
  })

  // Debug: see what's actually on the screen
  console.log('Screen content:', screen.debug())

  const user = userEvent.setup()

  // Open the dropdown menu
  const dropdownTrigger = screen.getByRole('button', { name: /more options/i })
  await user.click(dropdownTrigger)

  // Check that the menu item exists
  const addToGroupMenuItem = screen.queryByRole('menuitem', {
    name: /copy server to a group/i,
  })
  expect(addToGroupMenuItem).toBeInTheDocument()

  // Click the menu item to open the form
  await user.click(addToGroupMenuItem!)

  // Wait for the form to appear
  await waitFor(() => {
    expect(screen.getByText('Copy server to a group')).toBeVisible()
  })

  // Check that the form has the expected elements
  expect(screen.getByText('Select destination group')).toBeVisible()

  // Open the dropdown and select an option
  const selectTrigger = screen.getByRole('combobox')
  await user.click(selectTrigger)

  // Select the first group option - use the option element specifically
  const groupOption = screen.getByRole('option', { name: 'default' })
  await user.click(groupOption)

  // Submit the form
  const submitButton = screen.getByRole('button', { name: 'OK' })
  await user.click(submitButton)

  // The test should fail here if the API call is broken
  // We expect some kind of success message or the form to close
  // If the API call fails, we should see an error
  await waitFor(
    () => {
      // This will fail if the API call is broken, which is what we want
      expect(
        screen.queryByText('Copy server to a group')
      ).not.toBeInTheDocument()
    },
    { timeout: 5000 }
  )
})
