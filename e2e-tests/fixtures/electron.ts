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

const TEST_GROUP_NAME = 'playwright-automated-test-fixture'

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
    })
  } catch {
    // Group doesn't exist, which is fine
  }
}

async function createAndActivateTestGroup(window: Page): Promise<void> {
  // Click "Add a group" button
  const addGroupButton = window.getByRole('button', { name: /add a group/i })
  await addGroupButton.click()

  // Wait for dialog to appear
  await window.getByRole('dialog').waitFor()

  // Fill in the group name
  const nameInput = window.getByLabel(/name/i)
  await nameInput.fill(TEST_GROUP_NAME)

  // Click Create button
  const createButton = window.getByRole('button', { name: /create/i })
  await createButton.click()

  // Wait for dialog to close
  await window.getByRole('dialog').waitFor({ state: 'hidden' })

  // Click on the test group to activate it
  const groupLink = window.getByRole('link', { name: TEST_GROUP_NAME })
  await groupLink.click()

  // Wait for the empty state heading to appear (new group has no servers)
  await window
    .getByRole('heading', { name: /add your first mcp server/i })
    .waitFor()
}

export const test = base.extend<ElectronFixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    // Clean up any leftover test group from previous runs
    deleteTestGroupViaCli()

    const app = await electron.launch({
      executablePath: getExecutablePath(),
      recordVideo: { dir: 'test-videos' },
      args: ['--no-sandbox'],
    })

    await use(app)

    // Disable quit confirmation dialog before closing
    const window = await app.firstWindow()
    await window.evaluate(() => {
      localStorage.setItem('doNotShowAgain_confirm_quit', 'true')
    })

    await app.close()
  },

  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow()

    // Disable quit confirmation dialog early
    await window.evaluate(() => {
      localStorage.setItem('doNotShowAgain_confirm_quit', 'true')
    })

    // Wait for app to be ready
    await window.getByRole('link', { name: /mcp servers/i }).waitFor()

    // Create and activate the test group
    await createAndActivateTestGroup(window)

    await use(window)

    // Clean up test group (also runs before next test in case this fails)
    deleteTestGroupViaCli()
  },
})

export { expect } from '@playwright/test'
