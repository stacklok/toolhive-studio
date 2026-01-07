import { test, expect } from './fixtures/electron'

test('navigates to Settings page', async ({ window }) => {
  // Settings is an icon button link, find it by href
  await window.locator('a[href="/settings"]').click()
  await expect(
    window.getByRole('heading', { name: 'Settings', level: 1 })
  ).toBeVisible()
})
