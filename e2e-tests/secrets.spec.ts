import {
  test,
  expect,
  deleteTestSecretViaCli,
  TEST_SECRET_NAME,
} from './fixtures/electron'

test('navigates to Secrets tab', async ({ window }) => {
  await window.getByRole('link', { name: 'Secrets' }).click()
  await expect(
    window.getByRole('heading', { name: 'Secrets', level: 1 })
  ).toBeVisible()
})

test('creates and deletes a secret', async ({ window }) => {
  // Clean up any leftover test secret from previous failed runs
  deleteTestSecretViaCli()

  await window.getByRole('link', { name: 'Secrets' }).click()
  await expect(
    window.getByRole('heading', { name: 'Secrets', level: 1 })
  ).toBeVisible()

  // Click add button (works for both empty state and table view)
  await window.getByRole('button', { name: /add.*secret/i }).click()
  await window.getByRole('dialog').waitFor()

  // Fill in the form
  await window.getByPlaceholder('Name').fill(TEST_SECRET_NAME)
  await window.getByPlaceholder('Secret').fill('e2e-test-value')
  await window.getByRole('button', { name: 'Save' }).click()

  // Wait for dialog to close and verify secret appears in the table
  await window.getByRole('dialog').waitFor({ state: 'hidden' })
  await expect(window.getByText(TEST_SECRET_NAME)).toBeVisible()

  // Delete the secret via the dropdown menu
  const secretRow = window
    .getByRole('row')
    .filter({ hasText: TEST_SECRET_NAME })
  await secretRow.getByRole('button', { name: 'Secret options' }).click()
  await window.getByRole('menuitem', { name: 'Delete' }).click()

  // Verify the test secret is no longer visible
  await expect(window.getByText(TEST_SECRET_NAME)).not.toBeVisible()
})
