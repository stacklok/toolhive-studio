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
  await window.getByRole('tab', { name: 'Version' }).click()

  const versionRow = window
    .locator('text=ToolHive binary version')
    .locator('..')
  await expect(versionRow.locator('[data-slot="badge"]')).toHaveText(
    TOOLHIVE_VERSION
  )
})
