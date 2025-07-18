import { test, expect, _electron as electron } from '@playwright/test'

test('example test', async () => {
  const electronApp = await electron.launch({ args: ['.'] })
  const isPackaged = await electronApp.evaluate(async ({ app }) => {
    return app.isPackaged
  })

  expect(isPackaged).toBe(false)

  const window = await electronApp.firstWindow()
  // await window.screenshot({ path: 'intro.png' })

  expect(window.getByText('MCP Servers')).toBeVisible()

  await electronApp.close()
})
