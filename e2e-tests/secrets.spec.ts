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
  deleteTestSecretViaCli() // Clean up leftover from previous failed runs

  await window.getByRole('link', { name: 'Secrets' }).click()
  await expect(
    window.getByRole('heading', { name: 'Secrets', level: 1 })
  ).toBeVisible()

  await window.getByRole('button', { name: /add.*secret/i }).click()
  await window.getByRole('dialog').waitFor()
  await window.getByPlaceholder('Name').fill(TEST_SECRET_NAME)
  await window.getByPlaceholder('Secret').fill('e2e-test-value')
  await window.getByRole('button', { name: 'Save' }).click()

  await window.getByRole('dialog').waitFor({ state: 'hidden' })
  await expect(window.getByText(TEST_SECRET_NAME)).toBeVisible()

  const secretRow = window
    .getByRole('row')
    .filter({ hasText: TEST_SECRET_NAME })
  await secretRow.getByRole('button', { name: 'Secret options' }).click()
  await window.getByRole('menuitem', { name: 'Delete' }).click()

  await expect(window.getByText(TEST_SECRET_NAME)).not.toBeVisible()
})
