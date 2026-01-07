import { test, expect } from './fixtures/electron'

test('navigates to Secrets tab', async ({ window }) => {
  await window.getByRole('link', { name: 'Secrets' }).click()
  await expect(
    window.getByRole('heading', { name: 'Secrets', level: 1 })
  ).toBeVisible()
})
