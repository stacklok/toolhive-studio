import path from 'path'
import {
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test'

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

export interface LaunchedApp {
  app: ElectronApplication
  window: Page
  baseUrl: string
}

/**
 * Launch the Electron app bound to a specific userDataDir so the same
 * directory can be reused across launches within a single test.
 *
 * Mirrors the setup in e2e-tests/fixtures/electron.ts but exposes the raw
 * app/window instead of running the shared MCP server group bootstrap.
 */
export async function launchApp(userDataDir: string): Promise<LaunchedApp> {
  const app = await electron.launch({
    executablePath: getExecutablePath(),
    ...(process.env.CI ? { recordVideo: { dir: 'test-videos' } } : {}),
    args: ['--no-sandbox', `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      TOOLHIVE_E2E: 'true',
    },
  })

  const window = await app.firstWindow()

  await window.route('https://*.sentry.io/**', (route) => {
    throw new Error(`Sentry request blocked: ${route.request().url()}`)
  })

  // Disable quit confirmation so app.close() returns quickly.
  await window.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (globalThis as any).electronAPI.setSkipQuitConfirmation(true)
  })

  await window.getByRole('link', { name: /mcp servers/i }).waitFor()

  const port = await window.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await (globalThis as any).electronAPI.getToolhivePort()) as number
  })

  if (!port) {
    throw new Error('Failed to resolve ToolHive port from the launched app')
  }

  const baseUrl = `http://127.0.0.1:${port}`

  await waitForThvReady(baseUrl)

  return { app, window, baseUrl }
}

/**
 * Thin wrapper around `fetch` that raises on non-2xx/4xx responses the caller
 * wants to treat as failures, optionally returning parsed JSON.
 */
export async function thvFetch<T = unknown>(
  baseUrl: string,
  apiPath: string,
  init?: RequestInit & { expectStatus?: number[] }
): Promise<{ status: number; json: T | null }> {
  const { expectStatus, ...rest } = init ?? {}
  const res = await fetch(`${baseUrl}${apiPath}`, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...(rest.headers ?? {}),
    },
  })

  if (expectStatus && !expectStatus.includes(res.status)) {
    const body = await res.text()
    throw new Error(
      `thvFetch ${apiPath} expected status in [${expectStatus.join(',')}], got ${res.status}: ${body}`
    )
  }

  const text = await res.text()
  let json: T | null = null
  if (text) {
    try {
      json = JSON.parse(text) as T
    } catch {
      json = null
    }
  }
  return { status: res.status, json }
}

async function waitForThvReady(
  baseUrl: string,
  { timeoutMs = 30_000 } = {}
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/v1beta/groups`)
      if (res.ok) return
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(
    `ToolHive API at ${baseUrl} did not become ready within ${timeoutMs}ms`
  )
}
