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

async function openProviderSettingsDialog(window: Page): Promise<boolean> {
  // Try "Configure your providers" button first (shown when no provider is configured)
  const configureButton = window.getByRole('button', {
    name: /configure your providers/i,
  })
  if (await configureButton.isVisible().catch(() => false)) {
    await configureButton.click()
    await window.getByRole('dialog').waitFor()
    return true
  }

  // Try model selector dropdown → "Provider Settings" (shown when provider is configured)
  const modelSelectorButton = window.getByRole('button', {
    name: /select ai model/i,
  })
  if (await modelSelectorButton.isVisible().catch(() => false)) {
    await modelSelectorButton.click()
    await window.getByRole('menuitem', { name: /provider settings/i }).click()
    await window.getByRole('dialog').waitFor()
    return true
  }

  // Also check if a model is already selected (button shows model name)
  const modelButton = window.locator('button:has-text("qwen")').first()
  if (await modelButton.isVisible().catch(() => false)) {
    await modelButton.click()
    await window.getByRole('menuitem', { name: /provider settings/i }).click()
    await window.getByRole('dialog').waitFor()
    return true
  }

  return false
}

async function clearOllamaProviderViaUI(window: Page): Promise<void> {
  await window.getByRole('link', { name: 'Playground' }).click()
  await expect(
    window.getByRole('heading', { name: 'Playground', level: 1 })
  ).toBeVisible()

  const dialogOpened = await openProviderSettingsDialog(window)
  if (!dialogOpened) {
    return // Nothing to clear
  }

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

    // Open provider settings (handle both unconfigured and configured states)
    const dialogOpened = await openProviderSettingsDialog(window)
    expect(dialogOpened).toBe(true)

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

    // Select an Ollama model
    const modelSelector = window
      .locator('button')
      .filter({
        has: window.locator('svg'),
      })
      .filter({ hasText: /select ai model|ollama/i })
      .first()
    await modelSelector.click()

    // Hover over Ollama submenu to see models
    await window.getByRole('menuitem', { name: /ollama/i }).hover()
    await window
      .getByRole('menuitem', { name: new RegExp(OLLAMA_MODEL) })
      .click()

    await expect(window.getByPlaceholder(/type your message/i)).toBeVisible()

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
