import { test, expect } from './fixtures/electron'

test('app starts and shows test group', async ({ window }) => {
  // Verify the test group was created by the fixture
  const groupLink = window.getByRole('link', {
    name: /playwright-automated-test-fixture/i,
  })
  await expect(groupLink).toBeVisible()
})

test('install and uninstall server from registry', async ({ window }) => {
  await window.getByRole('button', { name: /add an mcp server/i }).click()
  await window.getByRole('menuitem', { name: /from the registry/i }).click()
  await window.getByText('everything').click()
  await window.getByRole('button', { name: /install server/i }).click()
  await window.getByRole('dialog').waitFor()

  // Use custom name and test group to avoid conflicts
  const serverNameInput = window.getByLabel('Server name')
  await serverNameInput.fill('e2e-test-server')
  await window.getByRole('combobox', { name: 'Group' }).click()
  await window
    .getByRole('option', { name: 'playwright-automated-test-fixture' })
    .click()

  await window.getByRole('button', { name: /install server/i }).click()

  // The View button is a Link inside a Button, so we use getByRole('link')
  const viewButton = window.getByRole('link', { name: /^view$/i })
  await viewButton.waitFor()
  await viewButton.click()

  await window.getByText('Running').waitFor()

  await window.getByRole('button', { name: /more options/i }).click()
  await window.getByRole('menuitem', { name: /remove/i }).click()
  await window.getByRole('button', { name: /remove/i }).click()

  const emptyState = window.getByRole('heading', {
    name: /add your first mcp server/i,
  })
  await emptyState.waitFor()
  await expect(emptyState).toBeVisible()
})
