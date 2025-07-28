import {
  test as base,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test'

type ElectronFixtures = {
  electronApp: ElectronApplication
  window: Page
}

export const test = base.extend<ElectronFixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    const app = await electron.launch({
      args: ['.'],
      recordVideo: { dir: 'test-videos' },
    })

    await use(app)

    const window = await app.firstWindow()
    await window.evaluate(() => {
      // mock confirm quit
      localStorage.setItem('doNotShowAgain_confirm_quit', 'true')
    })

    // Ensure app is closed and video is recorded
    const appToClose = app.close()
    await appToClose
  },

  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow()
    await use(window)
  },
})

export { expect } from '@playwright/test'
