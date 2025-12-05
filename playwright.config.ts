import { defineConfig } from '@playwright/test'
import { LONG_TIMEOUT } from './e2e-tests/fixtures/electron'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e-tests',
  timeout: LONG_TIMEOUT,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'only-on-failure',
  },
})
