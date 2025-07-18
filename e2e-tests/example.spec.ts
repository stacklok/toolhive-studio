import { test, expect, _electron as electron } from '@playwright/test'

test('app starts and stops properly with ephemeral containers', async () => {
  const electronApp = await electron.launch({
    args: ['.', '--ephemeral-containers'],
  })
  const isPackaged = await electronApp.evaluate(async ({ app }) => {
    return app.isPackaged
  })

  expect(isPackaged).toBe(false)

  const window = await electronApp.firstWindow()

  const header = window.getByRole('heading', {
    name: /add your first mcp server/i,
  })
  await header.waitFor()
  expect(header).toBeVisible()

  const appToClose = electronApp.close()
  // const stoppingMessage = window.getByText('Stopping MCP Servers')
  // await stoppingMessage.waitFor()
  // expect(stoppingMessage).toBeVisible()

  await appToClose
})
