import path from 'path'
import fs from 'fs'
import os from 'os'
import { test as base, expect } from '@playwright/test'
import { test } from './fixtures/electron'
import { launchApp } from './helpers/app-relaunch'

// Standalone test (does not use the shared fixture) so the assertion runs
// against the app's true initial route, before any nav clicks happen.
base.describe('Skills default landing route', () => {
  base('app launches into the Skills page on /skills', async () => {
    const userDataDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'toolhive-e2e-skills-default-')
    )
    const launched = await launchApp(userDataDir)
    try {
      // Tabs are part of the Skills page only, so their presence proves we
      // landed on /skills rather than /group/default.
      await expect(
        launched.window.getByRole('tab', { name: 'Registry' })
      ).toBeVisible()
      await expect(
        launched.window.getByRole('tab', { name: 'Installed' })
      ).toBeVisible()
      await expect(
        launched.window.getByRole('tab', { name: 'Local Builds' })
      ).toBeVisible()

      // Installed is the default tab — empty state confirms its panel is the
      // active one on a clean userDataDir.
      await expect(
        launched.window.getByRole('heading', { name: /no skills installed/i })
      ).toBeVisible()
    } finally {
      await launched.close()
      fs.rmSync(userDataDir, { recursive: true, force: true })
    }
  })
})

test.describe('Skills page navigation', () => {
  test('switches between tabs and shows the right empty state', async ({
    window,
  }) => {
    // The shared fixture leaves us on the test group page; navigate to Skills.
    await window.getByRole('link', { name: /^skills$/i }).click()

    // Installed (default) shows the no-skills empty state.
    await expect(
      window.getByRole('heading', { name: /no skills installed/i })
    ).toBeVisible()

    // Local Builds shows its own empty state with a "Build skill" CTA.
    await window.getByRole('tab', { name: 'Local Builds' }).click()
    await expect(
      window.getByRole('heading', { name: /no local builds/i })
    ).toBeVisible()
    await expect(
      window.getByRole('button', { name: /build skill/i })
    ).toBeVisible()

    // Registry tab renders its toolbar (search input + view toggle).
    await window.getByRole('tab', { name: 'Registry' }).click()
    await expect(window.getByPlaceholder(/search/i).first()).toBeVisible()
  })
})
