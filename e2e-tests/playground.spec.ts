import { test, expect } from './fixtures/electron'
import type { Page } from '@playwright/test'
import {
  startTestMcpServer,
  type TestMcpServer,
} from './helpers/test-mcp-server'

const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:0.5b'
const TEST_GROUP_NAME = 'playwright-automated-test-fixture'

async function warmupOllamaModel(): Promise<void> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: 'Say hello',
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama warmup failed: ${response.status}`)
  }
}

async function waitForPlaygroundReady(window: Page): Promise<void> {
  const loadingText = window.getByText(/loading chat history/i)
  // May never appear if already loaded
  await loadingText
    .waitFor({ state: 'hidden', timeout: 10_000 })
    .catch(() => {})
}

async function isVisible(
  locator: ReturnType<Page['getByRole']>
): Promise<boolean> {
  return locator.isVisible().catch(() => false)
}

async function openProviderSettingsDialog(window: Page): Promise<void> {
  await waitForPlaygroundReady(window)

  const configureButton = window.getByRole('button', {
    name: /configure your providers/i,
  })
  if (await isVisible(configureButton)) {
    await configureButton.click()
    await window.getByRole('dialog').waitFor()
    return
  }

  await window.getByTestId('model-selector').click()
  await window.getByRole('menuitem', { name: /provider settings/i }).click()
  await window.getByRole('dialog').waitFor()
}

async function removeOllamaProvider(window: Page): Promise<void> {
  await openProviderSettingsDialog(window)

  const dialog = window.getByRole('dialog')
  await dialog.getByRole('button', { name: /ollama/i }).click()

  const trashButton = dialog.getByTestId('remove-credentials-button')
  if (await isVisible(trashButton)) {
    await trashButton.click()
  }

  await dialog.getByRole('button', { name: 'Save' }).click()
  await dialog.waitFor({ state: 'hidden' })
}

async function clearPlaygroundState(window: Page): Promise<void> {
  await window.getByRole('link', { name: 'Playground' }).click()
  await expect(
    window.getByRole('heading', { name: 'Playground', level: 1 })
  ).toBeVisible()

  await waitForPlaygroundReady(window)

  const clearChatButton = window.getByRole('button', { name: /clear chat/i })
  if (await isVisible(clearChatButton)) {
    await clearChatButton.click()
    await window.getByRole('button', { name: /delete/i }).click()
  }

  await removeOllamaProvider(window)
}

async function configureOllamaProvider(window: Page): Promise<void> {
  await openProviderSettingsDialog(window)

  await window.getByRole('button', { name: /ollama/i }).click()
  await window.getByPlaceholder('http://localhost:11434').fill(OLLAMA_URL)
  await window.getByTestId('refresh-models-button').click()

  await expect(window.getByText(/connection successful/i)).toBeVisible({
    timeout: 30_000,
  })

  await window.getByRole('button', { name: 'Save' }).click()
  await window.getByRole('dialog').waitFor({ state: 'hidden' })
}

async function addRemoteMcpServer(
  window: Page,
  serverName: string,
  serverUrl: string
): Promise<void> {
  await window.getByRole('link', { name: 'MCP Servers' }).click()
  await expect(
    window.getByRole('heading', { name: 'MCP Servers', level: 1 })
  ).toBeVisible()

  await window.getByRole('button', { name: /add an mcp server/i }).click()
  await window.getByRole('menuitem', { name: /remote mcp server/i }).click()
  await window.getByRole('dialog').waitFor()

  await window.getByPlaceholder('e.g. my-awesome-server').fill(serverName)

  await window.getByRole('combobox', { name: /group/i }).click()
  await window.getByRole('option', { name: TEST_GROUP_NAME }).click()

  await window.getByPlaceholder('e.g. https://example.com/mcp').fill(serverUrl)

  await window.getByRole('combobox', { name: /transport/i }).click()
  await window.getByRole('option', { name: /streamable http/i }).click()

  await window.getByRole('combobox', { name: /authorization/i }).click()
  await window.getByRole('option', { name: /dynamic client/i }).click()
  await window.getByLabel(/callback port/i).fill('8888')

  await window.getByRole('button', { name: /install server/i }).click()
  await window.getByRole('dialog').waitFor({ state: 'hidden' })

  // Wait for server to appear AND have "Running" status
  // The server card shows the name and status text
  await expect(window.getByText(new RegExp(serverName))).toBeVisible({
    timeout: 30_000,
  })
  // Verify the server is actually running (not starting/stopped/error)
  // Find the card containing the server name and verify it shows "Running" status
  await expect(
    window
      .locator('[data-slot="card"]')
      .filter({ hasText: serverName })
      .getByText('Running')
  ).toBeVisible({ timeout: 30_000 })
}

async function enableMcpServerTools(
  window: Page,
  serverName: string
): Promise<void> {
  await window.getByRole('link', { name: 'Playground' }).click()
  await waitForPlaygroundReady(window)

  await window.getByRole('button', { name: /mcp servers/i }).click()

  const serverCheckbox = window.getByRole('menuitemcheckbox', {
    name: new RegExp(serverName, 'i'),
  })
  await expect(serverCheckbox).toBeEnabled({ timeout: 30_000 })
  await serverCheckbox.click()
  await expect(serverCheckbox).toBeChecked({ timeout: 10_000 })

  // Wait for tools to be actually discovered and enabled (badge shows "X tools")
  // This ensures the backend has saved the enabled tools
  const toolsBadge = window.getByText(/\d+ tools?/)
  await expect(toolsBadge).toBeVisible({ timeout: 30_000 })

  await window.keyboard.press('Escape')
  // Wait for dropdown to close
  await expect(serverCheckbox).not.toBeVisible({ timeout: 5_000 })

  // Ensure Ollama is the selected provider - re-select if needed
  const modelSelector = window.getByTestId('model-selector')
  if (!(await isVisible(modelSelector.getByText(/qwen/i)))) {
    await modelSelector.click()
    await window.getByRole('menuitem', { name: /ollama/i }).click()
    await window.getByRole('menuitem', { name: /qwen/i }).first().click()
  }

  // Verify model is selected
  await expect(modelSelector.getByText(/qwen/i)).toBeVisible({ timeout: 5_000 })
}

test('navigates to Playground tab', async ({ window }) => {
  await window.getByRole('link', { name: 'Playground' }).click()
  await expect(
    window.getByRole('heading', { name: 'Playground', level: 1 })
  ).toBeVisible()
})

test.describe('Playground chat with Ollama', () => {
  test.slow()

  test.beforeAll(async () => {
    await warmupOllamaModel()
  })

  test('sends message and receives response', async ({ window }) => {
    await clearPlaygroundState(window)
    await configureOllamaProvider(window)

    const messageInput = window.getByPlaceholder(/type your message/i)
    await expect(messageInput).toBeVisible({ timeout: 10_000 })

    const testId = `test_${Date.now()}`
    await messageInput.fill(`Reply with exactly: "${testId}"`)
    await window.keyboard.press('Enter')

    await expect(window.getByText(new RegExp(testId))).toBeVisible({
      timeout: 120_000,
    })
  })
})

test.describe('Playground with MCP tool calling', () => {
  test.slow()

  let testServer: TestMcpServer

  test.beforeAll(
    async () => {
      await warmupOllamaModel()
      testServer = await startTestMcpServer()
    },
    { timeout: 120_000 }
  )

  test.afterAll(async () => {
    await testServer?.stop()
  })

  test('chat still works after adding remote MCP server', async ({
    window,
  }) => {
    const serverName = `e2e-test-${Date.now()}`

    await clearPlaygroundState(window)
    await configureOllamaProvider(window)
    await addRemoteMcpServer(window, serverName, testServer.url)

    // Go back to playground WITHOUT enabling tools - just test chat works
    await window.getByRole('link', { name: 'Playground' }).click()
    await waitForPlaygroundReady(window)

    const messageInput = window.getByPlaceholder(/type your message/i)
    await expect(messageInput).toBeVisible({ timeout: 10_000 })

    const testId = `test_${Date.now()}`
    await messageInput.fill(`Reply with exactly: "${testId}"`)
    await window.keyboard.press('Enter')

    await expect(window.getByText(new RegExp(testId))).toBeVisible({
      timeout: 120_000,
    })
  })

  test('model responds with tools enabled', async ({ window }) => {
    const serverName = `e2e-test-${Date.now()}`

    await clearPlaygroundState(window)
    await configureOllamaProvider(window)

    await addRemoteMcpServer(window, serverName, testServer.url)
    await enableMcpServerTools(window, serverName)

    const messageInput = window.getByPlaceholder(/type your message/i)
    await expect(messageInput).toBeVisible({ timeout: 10_000 })

    // Simple prompt that doesn't require tool calling - just test model responds
    const testId = `test_${Date.now()}`
    await messageInput.fill(`Reply with exactly: "${testId}"`)
    await window.keyboard.press('Enter')

    await expect(window.getByText(new RegExp(testId))).toBeVisible({
      timeout: 120_000,
    })
  })

  test('calls MCP tool and receives secret code in response', async ({
    window,
  }, testInfo) => {
    const serverName = `e2e-test-${Date.now()}`

    await clearPlaygroundState(window)
    await configureOllamaProvider(window)

    await addRemoteMcpServer(window, serverName, testServer.url)
    await enableMcpServerTools(window, serverName)

    const messageInput = window.getByPlaceholder(/type your message/i)
    await expect(messageInput).toBeVisible({ timeout: 10_000 })
    await messageInput.fill(
      'Call get_secret_code tool now and tell me what it returns.'
    )
    await window.keyboard.press('Enter')

    try {
      await expect(
        window.getByText(new RegExp(testServer.secretCode, 'i'))
      ).toBeVisible({ timeout: 120_000 })
    } catch (error) {
      // Print MCP server logs for debugging
      const logs = await testServer.getLogs()
      console.log('=== MCP Server Logs ===')
      logs.forEach((log) => console.log(log))
      console.log('=======================')
      testInfo.attach('mcp-server-logs', {
        body: logs.join('\n'),
        contentType: 'text/plain',
      })
      throw error
    }
  })
})
