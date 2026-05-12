/**
 * Minimal Electron main (ESM): opens Node inspector DevTools in a BrowserWindow.
 *
 *   TOOLHIVE_INSPECT_DEVTOOLS_URL=<url> electron scripts/open-inspector-devtools.mjs
 *
 * Kept as `.mjs` (not `.ts`) on purpose: invoking Electron as
 * `electron --import <tsx-loader> <entry.ts>` makes Electron's GUI-mode argv
 * parser treat the loader's file:// URL as the app URL and render it in a
 * window — see git history. Loading the file natively avoids that entirely;
 * the orchestrator (start-inspect.ts) stays TypeScript.
 *
 * Env:
 * - TOOLHIVE_INSPECT_DEVTOOLS_URL — the devtools:// URL to load (required).
 * - TOOLHIVE_INSPECT_PARENT_PID   — parent orchestrator pid; if set, the
 *   helper polls and self-quits when the parent disappears (covers parent
 *   crashes / SIGKILL where the explicit kill from the orchestrator never
 *   arrives).
 */
import { app, BrowserWindow } from 'electron'

const devtoolsUrl = process.env.TOOLHIVE_INSPECT_DEVTOOLS_URL?.trim()

if (!devtoolsUrl) {
  console.error(
    'open-inspector-devtools: TOOLHIVE_INSPECT_DEVTOOLS_URL must be set'
  )
  process.exit(1)
}

const quit = () => {
  if (!app.isReady()) {
    process.exit(0)
  }
  app.exit(0)
}

for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  process.on(sig, quit)
}

const parentPidEnv = process.env.TOOLHIVE_INSPECT_PARENT_PID?.trim()
const parentPid = parentPidEnv ? Number.parseInt(parentPidEnv, 10) : NaN
if (Number.isFinite(parentPid) && parentPid > 0) {
  setInterval(() => {
    try {
      process.kill(parentPid, 0)
    } catch {
      quit()
    }
  }, 1500).unref()
}

void app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: true,
    width: 1280,
    height: 900,
    webPreferences: { sandbox: false },
  })
  win.on('closed', () => {
    app.quit()
  })
  void win.loadURL(devtoolsUrl)
})
