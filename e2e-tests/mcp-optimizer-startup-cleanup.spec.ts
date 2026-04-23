import path from 'path'
import fs from 'fs'
import os from 'os'
import { execSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { launchApp, thvFetch, type LaunchedApp } from './helpers/app-relaunch'
import {
  startTestMcpServer,
  type TestMcpServer,
} from './helpers/test-mcp-server'

const OPTIMIZER_GROUP = '__mcp-optimizer__'
const META_MCP_SERVER = 'toolhive-mcp-optimizer'
const CUSTOM_GROUP = 'pw-optimizer-custom'
const TEST_CLIENT = 'vscode'

function getThvPath(): string {
  const platform = process.platform
  const arch = process.arch
  const binName = platform === 'win32' ? 'thv.exe' : 'thv'
  return path.join(__dirname, '..', 'bin', `${platform}-${arch}`, binName)
}

/**
 * Best-effort cleanup of leftover groups via the thv CLI. The CLI requires a
 * Docker-compatible runtime but we already require that for e2e tests.
 */
function bestEffortCliCleanup(): void {
  const thvPath = getThvPath()
  const env = { ...process.env, TOOLHIVE_SKIP_DESKTOP_CHECK: 'true' }
  for (const group of [OPTIMIZER_GROUP, CUSTOM_GROUP]) {
    try {
      execSync(`"${thvPath}" group rm "${group}" --with-workloads`, {
        input: 'y\n',
        stdio: ['pipe', 'ignore', 'ignore'],
        env,
      })
    } catch {
      // Group does not exist - that's the happy path.
    }
  }
}

async function createGroupViaUi(
  launched: LaunchedApp,
  groupName: string
): Promise<void> {
  const { window } = launched
  await window.getByRole('button', { name: /add a group/i }).click()
  await window.getByRole('dialog').waitFor()
  await window.getByLabel(/name/i).fill(groupName)
  await window.getByRole('button', { name: /create/i }).click()
  await window.getByRole('dialog').waitFor({ state: 'hidden' })
}

async function seedOptimizerState(
  baseUrl: string,
  testServer: TestMcpServer
): Promise<void> {
  await thvFetch(baseUrl, '/api/v1beta/groups', {
    method: 'POST',
    body: JSON.stringify({ name: OPTIMIZER_GROUP }),
    expectStatus: [200, 201],
  })

  await thvFetch(baseUrl, '/api/v1beta/clients/register', {
    method: 'POST',
    body: JSON.stringify({
      names: [TEST_CLIENT],
      groups: [OPTIMIZER_GROUP],
    }),
    expectStatus: [200, 201],
  })

  // Create a remote meta-mcp workload so GET /workloads/meta-mcp later returns
  // the ALLOWED_GROUPS env var that drives the restoration path. A remote
  // workload avoids any Docker image pull complications.
  await thvFetch(baseUrl, '/api/v1beta/workloads', {
    method: 'POST',
    body: JSON.stringify({
      name: META_MCP_SERVER,
      group: OPTIMIZER_GROUP,
      url: testServer.url,
      transport: 'streamable-http',
      env_vars: {
        ALLOWED_GROUPS: CUSTOM_GROUP,
      },
    }),
    expectStatus: [200, 201, 202],
  })
}

async function waitForOptimizerCleanup(baseUrl: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const { json } = await thvFetch<{
          groups?: Array<{ name?: string; registered_clients?: string[] }>
        }>(baseUrl, '/api/v1beta/groups', { expectStatus: [200] })
        const groups = json?.groups ?? []
        const optimizerGroup = groups.find((g) => g.name === OPTIMIZER_GROUP)
        const customGroup = groups.find((g) => g.name === CUSTOM_GROUP)
        return {
          optimizerGone: !optimizerGroup,
          customHasClient:
            customGroup?.registered_clients?.includes(TEST_CLIENT) ?? false,
        }
      },
      // App-side readiness wait can itself take up to TOOLHIVE_READY_MAX_WAIT_MS
      // (60s). Give the poll a budget that exceeds that plus cleanup time so
      // slow CI runners don't flake even though in practice this completes
      // well under a second.
      { timeout: 120_000, intervals: [500, 1000, 2000] }
    )
    .toEqual({ optimizerGone: true, customHasClient: true })
}

test.describe('MCP Optimizer startup cleanup', () => {
  let userDataDir: string
  let testServer: TestMcpServer

  test.beforeAll(async () => {
    bestEffortCliCleanup()
    testServer = await startTestMcpServer()
  })

  test.afterAll(async () => {
    await testServer?.stop()
    bestEffortCliCleanup()
  })

  test.beforeEach(() => {
    userDataDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'toolhive-e2e-optimizer-cleanup-')
    )
  })

  test.afterEach(() => {
    fs.rmSync(userDataDir, { recursive: true, force: true })
  })

  test('restores clients to the custom group and deletes __mcp-optimizer__ on next launch', async () => {
    // Session 1: seed the legacy MCP Optimizer state.
    const firstLaunch = await launchApp(userDataDir)
    try {
      await createGroupViaUi(firstLaunch, CUSTOM_GROUP)
      await seedOptimizerState(firstLaunch.baseUrl, testServer)

      // Sanity: both groups exist and optimizer has the registered client.
      const { json: seeded } = await thvFetch<{
        groups?: Array<{ name?: string; registered_clients?: string[] }>
      }>(firstLaunch.baseUrl, '/api/v1beta/groups', { expectStatus: [200] })
      const seededOptimizer = seeded?.groups?.find(
        (g) => g.name === OPTIMIZER_GROUP
      )
      expect(seededOptimizer?.registered_clients).toContain(TEST_CLIENT)
      expect(seeded?.groups?.some((g) => g.name === CUSTOM_GROUP)).toBe(true)
    } finally {
      await firstLaunch.close()
    }

    // Session 2: relaunching with the same userDataDir should trigger the
    // startup cleanup hook, which restores clients and deletes the group.
    const secondLaunch = await launchApp(userDataDir)
    try {
      await waitForOptimizerCleanup(secondLaunch.baseUrl)

      // The meta-mcp workload is deleted as part of ?with-workloads=true.
      const { status: workloadStatus } = await thvFetch(
        secondLaunch.baseUrl,
        `/api/v1beta/workloads/${META_MCP_SERVER}`
      )
      expect(workloadStatus).toBe(404)

      // The user's custom group is preserved.
      const { json: finalGroups } = await thvFetch<{
        groups?: Array<{ name?: string }>
      }>(secondLaunch.baseUrl, '/api/v1beta/groups', { expectStatus: [200] })
      expect(finalGroups?.groups?.some((g) => g.name === CUSTOM_GROUP)).toBe(
        true
      )
    } finally {
      await secondLaunch.close()
    }
  })
})
