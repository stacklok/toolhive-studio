import { test, expect } from './fixtures/electron'
import type { Page } from '@playwright/test'

const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:0.5b'

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

  test('configures Ollama provider and sends chat message', async ({
    window,
  }) => {
    await clearPlaygroundState(window)

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

    // Chat input visible means provider was auto-selected successfully
    await expect(window.getByPlaceholder(/type your message/i)).toBeVisible({
      timeout: 10_000,
    })

    const testId = `test_${Date.now()}`
    await window
      .getByPlaceholder(/type your message/i)
      .fill(`Reply with exactly: "${testId}"`)
    await window.keyboard.press('Enter')

    await expect(window.getByText(new RegExp(testId))).toBeVisible({
      timeout: 120_000,
    })

    await clearPlaygroundState(window)
  })
})
