import { screen, waitFor, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Index } from '../index'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { MOCK_MCP_SERVERS } from '@/common/mocks/fixtures/servers'
import userEvent from '@testing-library/user-event'

const router = createTestRouter(Index)

it('should render list of MCP servers', async () => {
  renderRoute(router)
  await waitFor(() => {
    for (const mcpServer of MOCK_MCP_SERVERS) {
      expect(
        screen.queryByText(mcpServer.name),
        `Expected ${mcpServer.name} to be in the document`
      ).toBeVisible()
    }
  })
})

it('should contain the menu to run an MCP server', async () => {
  renderRoute(router)
  await waitFor(() => {
    expect(
      screen.getByRole('button', {
        name: /add a tool/i,
      })
    ).toBeVisible()
  })

  await userEvent.click(
    screen.getByRole('button', {
      name: /add a tool/i,
    })
  )
  await waitFor(() => {
    expect(screen.getByRole('menu')).toBeVisible()
  })
  expect(screen.getByRole('menuitem', { name: 'From the Store' })).toBeVisible()
  expect(
    screen.getByRole('menuitem', { name: 'Custom MCP server' })
  ).toBeVisible()
})

it('should restart server', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const postgresCard = screen.getByRole('link', { name: /postgres-db/i })
  const postgresSwitch = within(postgresCard).getByRole('switch', {
    name: /mutate server/i,
  })

  expect(postgresSwitch).not.toBeChecked()

  await userEvent.click(postgresSwitch)

  await waitFor(() => {
    expect(postgresSwitch).toBeChecked()
  })
})

it('should stop server', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('vscode-server')).toBeVisible()
  })

  const vscodeCard = screen.getByRole('link', { name: /vscode-server/i })
  const vscodeSwitch = within(vscodeCard).getByRole('switch', {
    name: /mutate server/i,
  })

  expect(vscodeSwitch).toBeChecked()

  await userEvent.click(vscodeSwitch)

  await waitFor(() => {
    expect(vscodeSwitch).not.toBeChecked()
  })
})

it('should show dropdown menu with remove option when clicking more options button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const postgresCard = screen.getByRole('link', { name: /postgres-db/i })
  const moreOptionsButton = within(postgresCard).getByRole('button', {
    name: /more options/i,
  })

  await userEvent.click(moreOptionsButton)

  expect(screen.getByRole('menuitem', { name: /remove/i })).toBeVisible()
})

it('should show confirmation dialog before deleting a server', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const postgresCard = screen.getByRole('link', { name: /postgres-db/i })
  const moreOptionsButton = within(postgresCard).getByRole('button', {
    name: /more options/i,
  })

  await userEvent.click(moreOptionsButton)
  const removeMenuItem = screen.getByRole('menuitem', { name: /remove/i })
  await userEvent.click(removeMenuItem)

  // Assert that a confirmation dialog appears (look for a recognizable title or message)
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeVisible()
    // Optionally, check for a title or message
    // expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
  })
})

it('should delete a server after confirmation', async () => {
  renderRoute(router)

  // Wait for the server card to appear
  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const postgresCard = screen.getByRole('link', { name: /postgres-db/i })
  const moreOptionsButton = within(postgresCard).getByRole('button', {
    name: /more options/i,
  })

  await userEvent.click(moreOptionsButton)
  const removeMenuItem = screen.getByRole('menuitem', { name: /remove/i })
  await userEvent.click(removeMenuItem)

  // Confirm the dialog
  const confirmButton = screen.getByRole('button', { name: /remove/i })
  await userEvent.click(confirmButton)

  // The server card should be removed from the UI
  await waitFor(() => {
    expect(screen.queryByText('postgres-db')).not.toBeInTheDocument()
  })
})
