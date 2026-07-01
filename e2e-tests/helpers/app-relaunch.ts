import http from 'node:http'
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
  socketPath: string
  /**
   * Terminate the app without waiting on the renderer's before-quit teardown.
   *
   * On Linux CI the regular `ElectronApplication.close()` has been observed to
   * hang indefinitely when a session has seeded a running workload via the thv
   * API (the graceful shutdown path waits on a remote workload that never
   * drains). We bypass that path via `app.exit(0)` and fall back to SIGKILL.
   */
  close: () => Promise<void>
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

  // Disable quit confirmation dialog as a safety net; our close() helper also
  // force-exits, so this mostly keeps manual tear-downs clean.
  await window.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (globalThis as any).electronAPI.setSkipQuitConfirmation(true)
  })

  await window.getByRole('link', { name: /mcp servers/i }).waitFor()

  const socketPath = await window.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await (globalThis as any).electronAPI.getToolhiveSocketPath()) as
      string | undefined
  })

  if (!socketPath) {
    throw new Error(
      'Failed to resolve ToolHive socket path from the launched app'
    )
  }

  await waitForThvReady(socketPath)

  const close = async () => {
    // Force an immediate exit via Electron's app.exit(), bypassing before-quit
    // handlers, the confirmation dialog, and any pending graceful-shutdown
    // work (e.g. waiting on seeded workloads to drain).
    try {
      await app.evaluate(({ app: electronApp }) => electronApp.exit(0))
    } catch {
      // Renderer/main may already be gone; ignore.
    }

    // Give the process a short window to exit cleanly, then hard-kill.
    const proc = app.process()
    await Promise.race([
      app.close().catch(() => {}),
      new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
    ])

    if (proc.exitCode === null && !proc.killed) {
      try {
        proc.kill('SIGKILL')
      } catch {
        // Process may have exited between the check and the kill.
      }
    }
  }

  return { app, window, socketPath, close }
}

/**
 * Performs an HTTP request against the thv server over its UNIX socket. Used
 * by e2e helpers to seed/inspect state out-of-band from the app UI, mirroring
 * the transport the production renderer uses (via the IPC bridge).
 */
function socketRequest(
  socketPath: string,
  apiPath: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath,
        path: apiPath,
        method: init?.method ?? 'GET',
        headers: {
          'content-type': 'application/json',
          ...(init?.headers ?? {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 500,
            text: Buffer.concat(chunks).toString('utf-8'),
          })
        )
        res.on('error', reject)
      }
    )
    req.on('error', reject)
    if (init?.body) req.write(init.body)
    req.end()
  })
}

/**
 * Thin wrapper around the thv UNIX socket transport that raises on unexpected
 * statuses and parses JSON when present.
 */
export async function thvFetch<T = unknown>(
  socketPath: string,
  apiPath: string,
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: string
    expectStatus?: number[]
  }
): Promise<{ status: number; json: T | null }> {
  const { expectStatus, ...rest } = init ?? {}
  const { status, text } = await socketRequest(socketPath, apiPath, rest)

  if (expectStatus && !expectStatus.includes(status)) {
    throw new Error(
      `thvFetch ${apiPath} expected status in [${expectStatus.join(',')}], got ${status}: ${text}`
    )
  }

  let json: T | null = null
  if (text) {
    try {
      json = JSON.parse(text) as T
    } catch {
      json = null
    }
  }
  return { status, json }
}

async function waitForThvReady(
  socketPath: string,
  { timeoutMs = 30_000 } = {}
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const { status } = await socketRequest(socketPath, '/api/v1beta/groups')
      if (status >= 200 && status < 300) return
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(
    `ToolHive API at socket ${socketPath} did not become ready within ${timeoutMs}ms`
  )
}
