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
  // Wait for loading state to complete
  const loadingText = window.getByText(/loading chat history/i)
  await loadingText.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {
    // Loading text might never appear if already loaded
  })
}

async function openProviderSettingsDialog(window: Page): Promise<void> {
  await waitForPlaygroundReady(window)

  // Check if "Configure your providers" button exists (no provider configured)
  const configureButton = window.getByRole('button', {
    name: /configure your providers/i,
  })
  if (await configureButton.isVisible().catch(() => false)) {
    await configureButton.click()
    await window.getByRole('dialog').waitFor()
    return
  }

  // Otherwise use model selector dropdown → "Provider Settings"
  await window.getByTestId('model-selector').click()
  await window.getByRole('menuitem', { name: /provider settings/i }).click()
  await window.getByRole('dialog').waitFor()
}

async function clearOllamaProviderViaUI(window: Page): Promise<void> {
  await window.getByRole('link', { name: 'Playground' }).click()
  await expect(
    window.getByRole('heading', { name: 'Playground', level: 1 })
  ).toBeVisible()

  await waitForPlaygroundReady(window)

  // Clear existing chat if present
  const clearChatButton = window.getByRole('button', { name: /clear chat/i })
  if (await clearChatButton.isVisible().catch(() => false)) {
    await clearChatButton.click()
    // Confirm the deletion dialog
    await window.getByRole('button', { name: /delete/i }).click()
  }

  await openProviderSettingsDialog(window)

  // Expand Ollama section
  const ollamaButton = window.getByRole('button', { name: /ollama/i })
  if (!(await ollamaButton.isVisible().catch(() => false))) {
    await window.getByRole('button', { name: 'Cancel' }).click()
    return
  }

  await ollamaButton.click()

  // Check if there's a "Configured" badge indicating existing config
  const configuredBadge = window.getByText('Configured')
  if (!(await configuredBadge.isVisible().catch(() => false))) {
    await window.getByRole('button', { name: 'Cancel' }).click()
    return
  }

  // Clear the server URL input
  const serverUrlInput = window.getByPlaceholder('http://localhost:11434')
  await serverUrlInput.clear()

  await window.getByRole('button', { name: 'Save' }).click()
  await window.getByRole('dialog').waitFor({ state: 'hidden' })
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
    await clearOllamaProviderViaUI(window)

    await window.getByRole('link', { name: 'Playground' }).click()
    await expect(
      window.getByRole('heading', { name: 'Playground', level: 1 })
    ).toBeVisible()

    // Open provider settings
    await openProviderSettingsDialog(window)

    // Configure Ollama
    await window.getByRole('button', { name: /ollama/i }).click()
    await window.getByPlaceholder('http://localhost:11434').fill(OLLAMA_URL)

    // Click refresh to test connection (find button within Ollama's collapsible content)
    const ollamaSection = window.locator('[data-state="open"]').filter({
      has: window.getByPlaceholder('http://localhost:11434'),
    })
    await ollamaSection
      .locator('button')
      .filter({ has: window.locator('svg.lucide-refresh-cw') })
      .click()

    await expect(window.getByText(/connection successful/i)).toBeVisible({
      timeout: 30_000,
    })

    await window.getByRole('button', { name: 'Save' }).click()
    await window.getByRole('dialog').waitFor({ state: 'hidden' })

    // After saving Ollama config, it auto-selects Ollama with its first model
    // Chat input should now be visible
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
  })
})
