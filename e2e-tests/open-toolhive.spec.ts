import { test, expect, _electron as electron } from '@playwright/test'

test('app starts and stops properly', async () => {
  const electronApp = await electron.launch({
    args: ['.'],
    recordVideo: { dir: 'test-videos' },
  })
  const isPackaged = await electronApp.evaluate(async ({ app }) => {
    return app.isPackaged
  })

  expect(isPackaged).toBe(false)

  const window = await electronApp.firstWindow()

  try {
    const header = window.getByRole('heading', {
      name: /add your first mcp server/i,
    })
    await header.waitFor()
    expect(header).toBeVisible()
  } finally {
    const appToClose = electronApp.close()
    await appToClose // otherwise videos won't be recorded!
  }
})
