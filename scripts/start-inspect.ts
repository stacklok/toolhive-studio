#!/usr/bin/env tsx
/**
 * Prints the inspector HTTP URL, starts Electron with --inspect, polls the
 * inspector targets endpoint, then opens the resulting `devtools://` URL in
 * this repo's bundled Electron (same Chromium stack as the app) so the Node
 * inspector debugger is one click away from `pnpm run start:inspect`.
 *
 * Env:
 * - INSPECT_PORT       — inspector port (default 9229)
 * - START_INSPECT_OPEN — set to "0" to skip opening DevTools (only print URL
 *                        and spawn Electron)
 */
import { spawn, type ChildProcess } from 'node:child_process'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')

const port = process.env.INSPECT_PORT ?? '9229'
const autoOpen = process.env.START_INSPECT_OPEN !== '0'

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Inspector HTTP (targets JSON): http://127.0.0.1:${port}/json
  DevTools: this project's Electron (bundled Chromium)
  Or: chrome://inspect → Remote Target → inspect
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

interface InspectorTarget {
  title?: string
  type?: string
  devtoolsFrontendUrl?: string
  webSocketDebuggerUrl?: string
}

function fetchInspectorTargets(p: string): Promise<InspectorTarget[]> {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${p}/json`, (res) => {
        let body = ''
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString()
        })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body) as unknown
            resolve(Array.isArray(parsed) ? (parsed as InspectorTarget[]) : [])
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })
}

function pickMainInspectorTarget(
  targets: InspectorTarget[]
): InspectorTarget | undefined {
  const mainish = targets.find((t) =>
    /electron|main|node/i.test(`${t.title ?? ''} ${t.type ?? ''}`)
  )
  return mainish ?? targets[0]
}

function devtoolsUrlFromTarget(t: InspectorTarget): string | undefined {
  if (t.devtoolsFrontendUrl) {
    return t.devtoolsFrontendUrl.startsWith('devtools://')
      ? t.devtoolsFrontendUrl
      : `devtools://${t.devtoolsFrontendUrl.replace(/^\/\//, '')}`
  }
  if (t.webSocketDebuggerUrl) {
    const ws = encodeURIComponent(t.webSocketDebuggerUrl)
    return `devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=${ws}`
  }
  return undefined
}

// `electron` npm package exports the path to the Electron binary (not the API).
function getBundledElectronExecutable(): string {
  return require('electron') as string
}

let inspectorHelperChild: ChildProcess | undefined

function killInspectorHelper(): void {
  if (!inspectorHelperChild || inspectorHelperChild.killed) {
    inspectorHelperChild = undefined
    return
  }
  try {
    inspectorHelperChild.kill('SIGTERM')
  } catch {
    // ignore
  }
  inspectorHelperChild = undefined
}

/**
 * Spawns bundled Electron with the `open-inspector-devtools.mjs` entry, with
 * the devtools URL passed via env. Resolves true if the process stays up past
 * the optimistic window; false on spawn error or quick non-zero exit.
 *
 * The entry stays as `.mjs` (not `.ts` via tsx) because Electron's GUI-mode
 * argv parser treats `--import <loader>` tokens as positional args and the
 * loader's file:// URL ends up loaded as the app URL.
 */
function openDevtoolsInBundledElectron(devtoolsUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    let electronExe: string
    try {
      electronExe = getBundledElectronExecutable()
    } catch (err) {
      console.warn('start-inspect: could not locate Electron:', err)
      resolve(false)
      return
    }

    const entry = path.join(__dirname, 'open-inspector-devtools.mjs')
    const helper = spawn(electronExe, [entry], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
      cwd: repoRoot,
      env: {
        ...process.env,
        TOOLHIVE_INSPECT_DEVTOOLS_URL: devtoolsUrl,
        // Watchdog: helper self-quits if this pid disappears, covering
        // crashes/SIGKILL where the explicit kill below never arrives.
        TOOLHIVE_INSPECT_PARENT_PID: String(process.pid),
      },
    })

    inspectorHelperChild = helper

    let finished = false
    const finish = (ok: boolean) => {
      if (finished) return
      finished = true
      clearTimeout(optimistic)
      resolve(ok)
    }

    // If the helper survives ~2s we assume it has reached app.whenReady() and
    // the BrowserWindow is on screen.
    const optimistic = setTimeout(() => finish(true), 2000)

    helper.on('error', (err) => {
      console.warn('start-inspect: helper spawn error:', err)
      if (inspectorHelperChild === helper) inspectorHelperChild = undefined
      finish(false)
    })

    helper.on('exit', (code, signal) => {
      if (inspectorHelperChild === helper) inspectorHelperChild = undefined
      if (signal) {
        finish(false)
        return
      }
      if (code !== 0 && code !== null) {
        console.warn(
          `start-inspect: DevTools helper exited early with code ${code}. Paste the devtools:// URL above into a Chromium browser to debug manually.`
        )
        finish(false)
        return
      }
      finish(true)
    })
  })
}

async function waitAndOpenDevTools(
  p: string,
  shouldStop: () => boolean
): Promise<void> {
  const intervalMs = 400
  const maxAttempts = Math.ceil(90_000 / intervalMs)

  for (let i = 0; i < maxAttempts; i++) {
    if (shouldStop()) return

    try {
      const targets = await fetchInspectorTargets(p)
      const chosen = pickMainInspectorTarget(targets)
      const url = chosen ? devtoolsUrlFromTarget(chosen) : undefined

      if (url) {
        const ok = await openDevtoolsInBundledElectron(url)
        if (ok) {
          console.info(
            "start-inspect: opened DevTools via this repo's Electron (bundled Chromium)"
          )
        } else {
          console.warn(
            'start-inspect: bundled Electron did not open DevTools. Open chrome://inspect or paste:',
            url
          )
        }
        return
      }
    } catch {
      // Inspector not listening yet (ECONNREFUSED etc.)
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  console.warn(
    'start-inspect: timed out waiting for inspector; use chrome://inspect manually.'
  )
}

let childExited = false

const child: ChildProcess = spawn(
  'pnpm',
  [
    'exec',
    'electron-forge',
    'start',
    '--',
    `--inspect=${port}`,
    '--experimental-network-inspection',
  ],
  {
    cwd: repoRoot,
    // Pipe stdout/stderr so we can watch for the "Waiting for the debugger to
    // disconnect" line — otherwise the helper's open WebSocket keeps the main
    // app alive forever and child.on('exit') never fires. stdin stays inherited
    // so electron-forge's interactive `rs<Enter>` restart still works.
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? '1' },
  }
)

const DEBUGGER_WAITING = 'Waiting for the debugger to disconnect'
const onChildOutput = (target: NodeJS.WriteStream) => (chunk: Buffer) => {
  target.write(chunk)
  if (chunk.includes(DEBUGGER_WAITING)) {
    killInspectorHelper()
  }
}
child.stdout?.on('data', onChildOutput(process.stdout))
child.stderr?.on('data', onChildOutput(process.stderr))

child.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
  childExited = true
  killInspectorHelper()
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    childExited = true
    killInspectorHelper()
  })
}

if (autoOpen) {
  void waitAndOpenDevTools(port, () => childExited)
}
