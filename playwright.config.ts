import { defineConfig } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e-tests',
  timeout: 120_000, // 2 minutes for tests and hooks
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Electron app only supports a single instance
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'only-on-failure',
  },
})
