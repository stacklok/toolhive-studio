import { test, _electron as electron } from '@playwright/test'

test('app starts and stops properly', async () => {
  const electronApp = await electron.launch({
    args: ['.'],
    recordVideo: { dir: 'test-videos' },
  })

  const window = await electronApp.firstWindow()
  await window.waitForLoadState('networkidle')
  const mainTitle = window.getByRole('heading', {
    name: /mcp servers/i,
  })
  await mainTitle.isVisible()
  const appToClose = electronApp.close()
  await appToClose
})
