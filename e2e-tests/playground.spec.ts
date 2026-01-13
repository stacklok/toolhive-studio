import {
  test,
  expect,
  LONG_TIMEOUT,
  TEST_GROUP_NAME,
} from './fixtures/electron'
import type { Page } from '@playwright/test'

const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:1.5b'

function generateRandomServerName(): string {
  const randomId = Math.floor(Math.random() * 100000000)
  return `fetch-${randomId}`
}

async function installFetchServer(
  window: Page,
  serverName: string
): Promise<void> {
  await window.getByRole('link', { name: 'MCP Servers' }).click()
  await window.getByRole('button', { name: /add an mcp server/i }).click()
  await window.getByRole('menuitem', { name: /from the registry/i }).click()
  await window.getByText('fetch', { exact: true }).click()
  await window.getByRole('button', { name: /install server/i }).click()
  await window.getByRole('dialog').waitFor()

  await window.getByLabel('Server name').fill(serverName)
  await window.getByRole('combobox', { name: 'Group' }).click()
  await window.getByRole('option', { name: TEST_GROUP_NAME }).click()
  await window.getByRole('button', { name: /install server/i }).click()

  await window.getByRole('link', { name: /^view$/i }).click()
  await window.getByText('Running').first().waitFor({ timeout: LONG_TIMEOUT })
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

test('navigates to Playground tab', async ({ window }) => {
  await window.getByRole('link', { name: 'Playground' }).click()
  await expect(
    window.getByRole('heading', { name: 'Playground', level: 1 })
  ).toBeVisible()
})

test.describe('Playground chat with Ollama', () => {
  test.slow()

  test.beforeAll(async () => {
    console.log('Warming up Ollama model...')
    try {
      await warmupOllamaModel()
      console.log('Ollama warmup complete')
    } catch (error) {
      console.error('Ollama warmup failed:', error)
      throw error
    }
  })

  // Disable retries - if Ollama fails, retries won't help and just timeout
  test.describe.configure({ retries: 0 })

  test('configures Ollama provider and sends chat message', async ({
    window,
  }) => {
    await clearPlaygroundState(window)

    const fetchServerName = generateRandomServerName()
    await installFetchServer(window, fetchServerName)

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

    await enableMcpServer(window, fetchServerName)

    const secretCodeUrl =
      'https://gist.githubusercontent.com/kantord/c9d7cd71e5a6f26d5dbf229ff0b7cdf2/raw/327ce7d875a933b4d4c2bc674460de017c42cbb0/gistfile1.txt'
    await window
      .getByPlaceholder(/type your message/i)
      .fill(
        `Use the fetch tool to retrieve the content from ${secretCodeUrl} and tell me the secret code contained in it.`
      )
    await window.keyboard.press('Enter')

    // The model should use the fetch tool to get the secret code "potato42"
    await expect(window.getByText(/potato42/i)).toBeVisible({
      timeout: LONG_TIMEOUT,
    })

    await clearPlaygroundState(window)
  })
})
