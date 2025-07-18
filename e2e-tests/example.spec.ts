import { test, expect, _electron as electron } from '@playwright/test'
import { GenericContainer } from 'testcontainers'

test('app starts and stops properly', async () => {
  // Start Redis container
  const redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start()

  try {
    const electronApp = await electron.launch({
      args: ['.'],
      recordVideo: { dir: 'test-videos' },
    })
    const isPackaged = await electronApp.evaluate(async ({ app }) => {
      return app.isPackaged
    })

    expect(isPackaged).toBe(false)

    const window = await electronApp.firstWindow()

    // Wait for the app to load and show either the empty state or the main content
    await window.waitForLoadState('networkidle')

    // Check if we have the empty state (no servers) or the main content (has servers)
    const emptyStateHeading = window.getByRole('heading', {
      name: /add your first mcp server/i,
    })
    const mainTitle = window.getByRole('heading', {
      name: /mcp servers/i,
    })

    // Wait for either the empty state or the main title to appear
    await Promise.race([
      emptyStateHeading.waitFor({ timeout: 10000 }),
      mainTitle.waitFor({ timeout: 10000 }),
    ])

    // Verify that at least one of them is visible
    const hasEmptyState = await emptyStateHeading.isVisible()
    const hasMainTitle = await mainTitle.isVisible()

    expect(hasEmptyState || hasMainTitle).toBe(true)

    const appToClose = electronApp.close()
    // const stoppingMessage = window.getByText('Stopping MCP Servers')
    // await stoppingMessage.waitFor()
    // expect(stoppingMessage).toBeVisible()

    await appToClose
  } finally {
    // Stop Redis container
    await redisContainer.stop()
  }
})
