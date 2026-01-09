import { test, expect } from './fixtures/electron'
import type { Page } from '@playwright/test'
import {
  startMockMcpServer,
  type MockMcpServer,
} from './helpers/mock-mcp-server'

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

test('navigates to Playground tab', async ({ window }) => {
  await window.getByRole('link', { name: 'Playground' }).click()
  await expect(
    window.getByRole('heading', { name: 'Playground', level: 1 })
  ).toBeVisible()
})

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

  await expect(window.getByText(new RegExp(serverName))).toBeVisible({
    timeout: 30_000,
  })
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
  await expect(serverCheckbox).toBeVisible({ timeout: 10_000 })
  await serverCheckbox.click()

  await window.keyboard.press('Escape')

  // Ensure Ollama is the selected provider - re-select if needed
  const modelSelector = window.getByTestId('model-selector')
  const hasOllama = await modelSelector
    .getByText(/qwen/i)
    .isVisible()
    .catch(() => false)

  if (!hasOllama) {
    await modelSelector.click()
    await window.getByRole('menuitem', { name: /ollama/i }).click()
    await window.getByRole('menuitem', { name: /qwen/i }).first().click()
  }

  // Wait for tools to be fully loaded
  await window.waitForTimeout(2000)
}

test.describe('Playground with MCP tool calling', () => {
  test.slow()

  let mockServer: MockMcpServer

  test.beforeAll(async () => {
    console.log('Warming up Ollama model...')
    await warmupOllamaModel()
    console.log('Ollama warmup complete')

    console.log('Starting mock MCP server...')
    mockServer = await startMockMcpServer()
    console.log(`Mock MCP server running on port ${mockServer.port}`)
    console.log(`Expected secret code: ${mockServer.secretCode}`)
  })

  test.afterAll(async () => {
    if (mockServer) {
      console.log('Stopping mock MCP server...')
      await mockServer.stop()
    }
  })

  test('calls MCP tool and receives secret code in response', async ({
    window,
  }) => {
    const serverName = `e2e-mock-${Date.now()}`

    await clearPlaygroundState(window)

    await window.getByRole('link', { name: 'Playground' }).click()
    await configureOllamaProvider(window)

    await addRemoteMcpServer(window, serverName, mockServer.url)

    await enableMcpServerTools(window, serverName)

    await expect(window.getByPlaceholder(/type your message/i)).toBeVisible()

    await window
      .getByPlaceholder(/type your message/i)
      .fill(`Call get_secret_code tool now and tell me what it returns.`)
    await window.keyboard.press('Enter')

    // Wait for response containing the secret code (word + 2 digits like "apple82")
    await expect(
      window.getByText(new RegExp(mockServer.secretCode, 'i'))
    ).toBeVisible({
      timeout: 120_000,
    })

    await clearPlaygroundState(window)
  })
})
