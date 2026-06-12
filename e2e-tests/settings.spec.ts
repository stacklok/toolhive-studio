import { test, expect } from './fixtures/electron'
import { TOOLHIVE_VERSION } from '../utils/constants'

test('displays correct ToolHive binary version', async ({ window }) => {
  await window.getByRole('link', { name: 'Settings' }).click()
  await window.getByRole('tab', { name: 'Version' }).click()

  const versionRow = window
    .locator('text=ToolHive binary version')
    .locator('..')
  // The row shows the version detected from the bundled binary, which prints
  // it without the "v" prefix the build-time constant carries.
  await expect(versionRow).toContainText(TOOLHIVE_VERSION.replace(/^v/, ''))
})
