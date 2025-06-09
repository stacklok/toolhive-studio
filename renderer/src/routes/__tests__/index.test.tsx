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
        screen.queryByText(mcpServer.Name),
        `Expected ${mcpServer.Name} to be in the document`
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
