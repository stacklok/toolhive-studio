import {
  test,
  expect,
  LONG_TIMEOUT,
  TEST_GROUP_NAME,
} from './fixtures/electron'
import type { Page } from '@playwright/test'
import {
  startTestMcpServer,
  type TestMcpServer,
} from './helpers/test-mcp-server'

const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:1.5b'

function generateRandomServerName(): string {
  const randomId = Math.floor(Math.random() * 100000000)
  return `e2e-mcp-${randomId}`
}

async function setupTestMcpServer(): Promise<TestMcpServer> {
  return startTestMcpServer()
}

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

async function openProviderSettingsDialog(window: Page): Promise<void> {
  await waitForPlaygroundReady(window)

  const configureButton = window.getByRole('button', {
    name: /configure your providers/i,
  })
  if (await configureButton.isVisible().catch(() => false)) {
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
  if (await trashButton.isVisible().catch(() => false)) {
    await trashButton.click()
  }

  await dialog.getByRole('button', { name: 'Save' }).click()
  await dialog.waitFor({ state: 'hidden' })
}

async function enableMcpServer(
  window: Page,
  serverName: string
): Promise<void> {
  await window.getByRole('button', { name: /mcp servers/i }).click()
  await window.getByText(/available mcp servers/i).waitFor()
  await window
    .getByRole('menuitemcheckbox', { name: new RegExp(serverName, 'i') })
    .click()
  await window
    .getByText(/\d+ tools/i)
    .first()
    .waitFor()
  // Close the dropdown before continuing
  await window.keyboard.press('Escape')
}

async function selectOllamaModel(window: Page): Promise<void> {
  await window.getByTestId('model-selector').click()
  await window.getByRole('menuitem', { name: /ollama/i }).hover()
  const modelItem = window.getByRole('menuitem', { name: OLLAMA_MODEL })
  await modelItem.waitFor()
  await modelItem.click()
}

async function clearPlaygroundState(window: Page): Promise<void> {
  await window.getByRole('link', { name: 'Playground' }).click()
  await expect(
    window.getByRole('heading', { name: 'Playground', level: 1 })
  ).toBeVisible()

  await waitForPlaygroundReady(window)

  const clearChatButton = window.getByRole('button', { name: /clear chat/i })
  if (await clearChatButton.isVisible().catch(() => false)) {
    await clearChatButton.click()
    await window.getByRole('button', { name: /delete/i }).click()
  }

  await removeOllamaProvider(window)
}

test.describe('Playground chat with Ollama', () => {
  test.slow()

  let testServer: TestMcpServer

  test.beforeAll(async () => {
    console.log('Warming up Ollama model...')
    try {
      await warmupOllamaModel()
      console.log('Ollama warmup complete')
    } catch (error) {
      console.error('Ollama warmup failed:', error)
      throw error
    }

    testServer = await setupTestMcpServer()
  })

  test.afterAll(async () => {
    await testServer?.stop()
  })

  test('configures Ollama provider and sends chat message', async ({
    window,
  }) => {
    await clearPlaygroundState(window)

    const serverName = generateRandomServerName()

    await window.getByRole('link', { name: 'MCP Servers' }).click()
    await expect(window.getByRole('heading', { level: 1 })).toBeVisible()

    await window.getByRole('button', { name: /add an mcp server/i }).click()
    await window.getByRole('menuitem', { name: /remote mcp server/i }).click()
    await window.getByRole('dialog').waitFor()

    await window.getByPlaceholder('e.g. my-awesome-server').fill(serverName)

    await window.getByRole('combobox', { name: /group/i }).click()
    await window.getByRole('option', { name: TEST_GROUP_NAME }).click()

    await window
      .getByPlaceholder('e.g. https://example.com/mcp')
      .fill(testServer.url)

    await window.getByRole('combobox', { name: /transport/i }).click()
    await window.getByRole('option', { name: /streamable http/i }).click()

    await window.getByRole('combobox', { name: /authorization/i }).click()
    await window.getByRole('option', { name: /bearer token/i }).click()
    await window
      .getByPlaceholder('e.g. token_123_ABC_789_XYZ')
      .fill(testServer.bearerToken)

    await window.getByRole('button', { name: /install server/i }).click()
    await window.getByRole('dialog').waitFor({ state: 'hidden' })

    await window.getByRole('link', { name: TEST_GROUP_NAME }).click()
    await expect(window.getByText(new RegExp(serverName))).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      window
        .locator('[data-slot="card"]')
        .filter({ hasText: serverName })
        .getByText('Running')
    ).toBeVisible({ timeout: 30_000 })

    await window.getByRole('link', { name: 'Playground' }).click()
    await expect(
      window.getByRole('heading', { name: 'Playground', level: 1 })
    ).toBeVisible()

    await openProviderSettingsDialog(window)

    await window.getByRole('button', { name: /ollama/i }).click()
    await window.getByPlaceholder('http://localhost:11434').fill(OLLAMA_URL)

    await window.getByTestId('refresh-models-button').click()

    await expect(window.getByText(/connection successful/i)).toBeVisible({
      timeout: 30_000,
    })

    await window.getByRole('button', { name: 'Save' }).click()
    await window.getByRole('dialog').waitFor({ state: 'hidden' })

    await selectOllamaModel(window)

    await expect(window.getByPlaceholder(/type your message/i)).toBeVisible({
      timeout: 10_000,
    })

    await enableMcpServer(window, serverName)

    await window
      .getByPlaceholder(/type your message/i)
      .fill('Call the get_secret_code tool and tell me the code it returns.')
    await window.keyboard.press('Enter')

    await expect(
      window.getByText(new RegExp(testServer.secretCode, 'i'))
    ).toBeVisible({
      timeout: LONG_TIMEOUT,
    })

    await clearPlaygroundState(window)
  })
})
