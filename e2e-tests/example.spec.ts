import { test, expect, _electron as electron } from '@playwright/test'
import { GenericContainer, StartedTestContainer } from 'testcontainers'

test('app starts and stops properly', async () => {
  // Start Redis container
  const redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start()

  try {
    const electronApp = await electron.launch({ args: ['.'] })
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
  } finally {
    // Stop Redis container
    await redisContainer.stop()
  }
})
