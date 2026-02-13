import path from 'path'
import { execSync } from 'child_process'
import {
  test as base,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test'

type ElectronFixtures = {
  electronApp: ElectronApplication
  window: Page
}

export const TEST_GROUP_NAME = 'playwright-automated-test-fixture'
export const TEST_SECRET_NAME = 'E2E_TEST_SECRET'

/** Default timeout for most operations (10 seconds) */
export const DEFAULT_TIMEOUT = 10_000

/** Long timeout for operations that may take a while, like server installation (60 seconds) */
export const LONG_TIMEOUT = 60_000

function getExecutablePath(): string {
  const platform = process.platform
  const arch = process.arch
  const basePath = path.join(__dirname, '..', '..', 'out')

  if (platform === 'darwin') {
    return path.join(
      basePath,
      `ToolHive-darwin-${arch}`,
      'ToolHive.app',
      'Contents',
      'MacOS',
      'ToolHive'
    )
  } else if (platform === 'win32') {
    return path.join(basePath, `ToolHive-win32-${arch}`, 'ToolHive.exe')
  } else {
    return path.join(basePath, `ToolHive-linux-${arch}`, 'ToolHive')
  }
}

function getThvPath(): string {
  const platform = process.platform
  const arch = process.arch
  const binName = platform === 'win32' ? 'thv.exe' : 'thv'
  return path.join(__dirname, '..', '..', 'bin', `${platform}-${arch}`, binName)
}

function deleteTestGroupViaCli(): void {
  const thvPath = getThvPath()
  try {
    execSync(`"${thvPath}" group rm "${TEST_GROUP_NAME}" --with-workloads`, {
      input: 'y\n',
      stdio: ['pipe', 'ignore', 'ignore'],
      env: { ...process.env, TOOLHIVE_SKIP_DESKTOP_CHECK: 'true' },
    })
  } catch {
    // Group doesn't exist, which is fine
  }
}

export function deleteTestSecretViaCli(): void {
  const thvPath = getThvPath()
  try {
    execSync(`"${thvPath}" secret delete "${TEST_SECRET_NAME}"`, {
      stdio: ['pipe', 'ignore', 'ignore'],
      env: { ...process.env, TOOLHIVE_SKIP_DESKTOP_CHECK: 'true' },
    })
  } catch {
    // Secret doesn't exist, which is fine
  }
}

async function createAndActivateTestGroup(window: Page): Promise<void> {
  await window.getByRole('button', { name: /add a group/i }).click()
  await window.getByRole('dialog').waitFor()
  await window.getByLabel(/name/i).fill(TEST_GROUP_NAME)
  await window.getByRole('button', { name: /create/i }).click()
  await window.getByRole('dialog').waitFor({ state: 'hidden' })
  await window.getByRole('link', { name: TEST_GROUP_NAME }).click()
  await window
    .getByRole('heading', { name: /add your first mcp server/i })
    .waitFor()
}

export const test = base.extend<ElectronFixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    deleteTestGroupViaCli()

    const app = await electron.launch({
      executablePath: getExecutablePath(),
      recordVideo: { dir: 'test-videos' },
      args: ['--no-sandbox'],
      env: {
        ...process.env,
        TOOLHIVE_E2E: 'true',
      },
    })

    await use(app)

    // Disable quit confirmation dialog to prevent hang on close
    const window = await app.firstWindow()
    await window.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (globalThis as any).electronAPI.setSkipQuitConfirmation(true)
    })

    await app.close()
  },

  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow()

    await window.route('https://*.sentry.io/**', (route) => {
      throw new Error(`Sentry request blocked: ${route.request().url()}`)
    })

    const sentryDsn = await electronApp.evaluate(async () => {
      try {
        const Sentry = (await import('@sentry/electron/main')) as {
          getCurrentHub?: () => {
            getClient?: () => { getOptions?: () => { dsn?: string | null } }
          }
        }
        const client = Sentry.getCurrentHub?.().getClient?.()
        return client?.getOptions?.().dsn ?? null
      } catch {
        return null
      }
    })
    if (sentryDsn) {
      throw new Error(`Expected empty Sentry DSN during E2E, got: ${sentryDsn}`)
    }

    // Disable quit confirmation dialog to prevent hang on close
    await window.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (globalThis as any).electronAPI.setSkipQuitConfirmation(true)
    })

    await window.getByRole('link', { name: /mcp servers/i }).waitFor()
    await createAndActivateTestGroup(window)

    await use(window)

    deleteTestGroupViaCli()
  },
})

export { expect } from '@playwright/test'
