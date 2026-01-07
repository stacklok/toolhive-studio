import { test, expect } from './fixtures/electron'

test('navigates to Settings page', async ({ window }) => {
  await window.getByRole('button', { name: 'Settings' }).click()
  await expect(
    window.getByRole('heading', { name: 'Settings', level: 1 })
  ).toBeVisible()
})
