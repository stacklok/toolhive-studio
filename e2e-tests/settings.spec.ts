import { test, expect } from './fixtures/electron'
import { TOOLHIVE_VERSION } from '../utils/constants'

test('navigates to Settings page', async ({ window }) => {
  await window.getByRole('button', { name: 'Settings' }).click()
  await expect(
    window.getByRole('heading', { name: 'Settings', level: 1 })
  ).toBeVisible()
})

test('displays correct ToolHive binary version', async ({ window }) => {
  await window.getByRole('button', { name: 'Settings' }).click()
  await expect(
    window.getByRole('heading', { name: 'Settings', level: 1 })
  ).toBeVisible()

  // Navigate to Version tab
  await window.getByRole('tab', { name: 'Version' }).click()

  // Verify the ToolHive binary version matches the expected constant
  const versionRow = window
    .locator('text=ToolHive binary version')
    .locator('..')
  const versionBadge = versionRow.locator('[data-slot="badge"]')
  await expect(versionBadge).toHaveText(TOOLHIVE_VERSION)
})
