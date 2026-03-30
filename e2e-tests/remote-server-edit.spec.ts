import { test, expect, TEST_GROUP_NAME } from './fixtures/electron'
import type { Page } from '@playwright/test'
import {
  startTestMcpServer,
  type TestMcpServer,
} from './helpers/test-mcp-server'

function generateRandomServerName(): string {
  const randomId = Math.floor(Math.random() * 100000000)
  return `e2e-edit-${randomId}`
}

/**
 * Installs a remote MCP server with bearer token auth and waits for it to
 * reach the Running state.
 */
async function installRemoteServer(
  window: Page,
  serverName: string,
  testServer: TestMcpServer
): Promise<void> {
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

  await expect(
    window
      .locator('[data-slot="card"]')
      .filter({ hasText: serverName })
      .getByText('Running')
  ).toBeVisible({ timeout: 30_000 })
}

/**
 * Opens the "Edit configuration" dialog for a server card and saves without
 * making any changes.
 */
async function resaveServerWithoutChanges(
  window: Page,
  serverName: string
): Promise<void> {
  const serverCard = window
    .locator('[data-slot="card"]')
    .filter({ hasText: serverName })

  await serverCard.getByRole('button', { name: 'More options' }).click()
  await window.getByRole('menuitem', { name: /edit configuration/i }).click()
  await window.getByRole('dialog').waitFor()

  // Wait for the form to be fully populated with the existing server data
  await expect(
    window.getByRole('textbox', { name: /server url/i })
  ).not.toHaveValue('')

  // Save without making any changes — this is the exact scenario from issue #1821
  await window.getByRole('button', { name: /update server/i }).click()
  await window.getByRole('dialog').waitFor({ state: 'hidden' })
}

/**
 * Tests that re-saving a remote server configuration without making any
 * changes does not corrupt its auth credentials (regression for issue #1821).
 *
 * Note: this test covers the bearer token auth flow. The OAuth flow described
 * in #1821 requires a full mock OAuth server with browser redirect handling
 * and is covered at the unit/integration level in:
 *   - orchestrate-run-remote-server.test.tsx (convertCreateRequestToFormData)
 *   - dialog-form-remote-mcp.test.tsx (full form submit cycle)
 */
test.describe('Remote server edit', () => {
  let testServer: TestMcpServer

  test.beforeAll(async () => {
    testServer = await startTestMcpServer()
  })

  test.afterAll(async () => {
    await testServer?.stop()
  })

  test('re-saving a remote server without changes keeps it running (issue #1821)', async ({
    window,
  }) => {
    const serverName = generateRandomServerName()

    await window.getByRole('link', { name: 'MCP Servers' }).click()
    await expect(window.getByRole('heading', { level: 1 })).toBeVisible()

    // 1. Install the server and confirm it is Running
    await installRemoteServer(window, serverName, testServer)

    // 2. Open "Edit configuration" and save without any changes
    await resaveServerWithoutChanges(window, serverName)

    // 3. The server must still be Running — a corrupted secret would cause an error state
    await window.getByRole('link', { name: TEST_GROUP_NAME }).click()
    await expect(
      window
        .locator('[data-slot="card"]')
        .filter({ hasText: serverName })
        .getByText('Running')
    ).toBeVisible({ timeout: 30_000 })
  })
})
