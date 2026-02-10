import { test, expect } from './fixtures/electron'

test('install and uninstall server from registry', async ({ window }) => {
  await window.getByRole('button', { name: /add an mcp server/i }).click()
  await window.getByRole('menuitem', { name: /from the registry/i }).click()
  await window.getByText('everything').click()
  await window.getByRole('button', { name: /install server/i }).click()
  await window.getByRole('dialog').waitFor()

  await window.getByLabel('Server name').fill('e2e-test-server')
  await window.getByRole('combobox', { name: 'Group' }).click()
  await window
    .getByRole('option', { name: 'playwright-automated-test-fixture' })
    .click()
  await window.getByRole('button', { name: /install server/i }).click()

  await window.getByRole('link', { name: /^view$/i }).click()
  await window.getByText('Running').waitFor()

  await window.getByRole('button', { name: /more options/i }).click()
  await window.getByRole('menuitem', { name: /remove/i }).click()
  await window.getByRole('dialog').waitFor()
  await window.getByRole('button', { name: /remove/i }).click()
  await window.getByRole('dialog').waitFor({ state: 'hidden' })

  await expect(
    window.getByRole('heading', { name: /add your first mcp server/i })
  ).toBeVisible()
})
