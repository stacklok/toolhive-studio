import { test, expect } from './fixtures/electron'

test('app starts and stops properly', async ({ electronApp, window }) => {
  // Verify the app is running in development mode
  const isPackaged = await electronApp.evaluate(async ({ app }) => {
    return app.isPackaged
  })
  expect(isPackaged).toBe(false)

  // Verify the expected UI element is present
  const header = window.getByRole('heading', {
    name: /add your first mcp server/i,
  })
  await header.waitFor()
  expect(header).toBeVisible()
})
