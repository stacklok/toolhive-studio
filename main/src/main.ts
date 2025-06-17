import {
  app,
  BrowserWindow,
  Tray,
  ipcMain,
  nativeTheme,
  session,
  shell,
} from 'electron'
import path from 'node:path'
import { existsSync } from 'node:fs'
import started from 'electron-squirrel-startup'
import { spawn } from 'node:child_process'
import * as Sentry from '@sentry/electron/main'
import { initTray, updateTrayStatus } from './system-tray'
import { setAutoLaunch, getAutoLaunchStatus } from './auto-launch'
import net from 'node:net'
import { getCspString } from './csp'
import { stopAllServers } from './graceful-exit'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
})

// Forge environment variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined
declare const MAIN_WINDOW_VITE_NAME: string

const binName = process.platform === 'win32' ? 'thv.exe' : 'thv'
const binPath = app.isPackaged
  ? path.join(
      process.resourcesPath,
      'bin',
      `${process.platform}-${process.arch}`,
      binName
    )
  : path.resolve(
      __dirname,
      '..',
      '..',
      'bin',
      `${process.platform}-${process.arch}`,
      binName
    )

console.log(`ToolHive binary path: ${binPath}`)
console.log(`Binary file exists: ${existsSync(binPath)}`)

let toolhiveProcess: ReturnType<typeof spawn> | undefined
let tray: Tray | null = null
let toolhivePort: number | undefined
let isQuitting = false

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, () => {
      const address = server.address()
      if (typeof address === 'object' && address && address.port) {
        const port = address.port
        server.close(() => resolve(port))
      } else {
        reject(new Error('Failed to get port'))
      }
    })
    server.on('error', reject)
  })
}

async function startToolhive() {
  if (!existsSync(binPath)) {
    console.error(`ToolHive binary not found at: ${binPath}`)
    return
  }
  toolhivePort = await findFreePort()
  console.log(`Starting ToolHive from: ${binPath} on port ${toolhivePort}`)
  toolhiveProcess = spawn(
    binPath,
    ['serve', '--openapi', `--port=${toolhivePort}`],
    {
      stdio: 'ignore',
      detached: true,
    }
  )
  toolhiveProcess.on('error', (error) => {
    console.error('Failed to start ToolHive:', error)
    if (tray) updateTrayStatus(tray, false)
  })
  toolhiveProcess.on('exit', (code) => {
    console.log(`ToolHive process exited with code: ${code}`)
    toolhiveProcess = undefined
    if (tray) updateTrayStatus(tray, false)
  })
  toolhiveProcess.unref()
  if (tray) updateTrayStatus(tray, true)
}

let tearingDown = false

/** Hold the quit, run teardown, then really exit. */
export async function blockQuit(source: string, event?: Electron.Event) {
  if (tearingDown) return
  tearingDown = true
  isQuitting = true
  console.info(`[${source}] initiating graceful teardown...`)

  if (event) {
    event.preventDefault()
  }

  mainWindow?.webContents.send('graceful-exit')

  try {
    await stopAllServers(binPath, toolhivePort!)
  } catch (err) {
    console.error('Teardown failed:', err)
  } finally {
    // Stop the embedded ToolHive server
    if (toolhiveProcess && !toolhiveProcess.killed) {
      toolhiveProcess.kill()
    }

    tray?.destroy()
    app.quit()
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Windows-installer helper (Squirrel)
// ────────────────────────────────────────────────────────────────────────────
if (started) {
  app.quit()
}

// ────────────────────────────────────────────────────────────────────────────
//  Main-window creation
// ────────────────────────────────────────────────────────────────────────────
const shouldStartHidden =
  process.argv.includes('--hidden') || process.argv.includes('--start-hidden')
const isDevelopment = process.env.NODE_ENV === 'development'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1040,
    height: 700,
    show: !shouldStartHidden,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDevelopment,
    },
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hidden',
          trafficLightPosition: { x: 21, y: 16 },
        }
      : {}),
  })

  // Windows: minimise-to-tray instead of close
  if (process.platform === 'win32') {
    mainWindow.on('minimize', () => {
      if (shouldStartHidden || tray) mainWindow.hide()
    })
    mainWindow.on('close', (event) => {
      if (!isQuitting && tray) {
        event.preventDefault()
        mainWindow.hide()
      }
    })
  }

  // External links → default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/`)
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    )
  }

  return mainWindow
}

let mainWindow: BrowserWindow | null = null

app.on('ready', () => {
  startToolhive()
  mainWindow = createWindow()
})

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (isDevelopment) {
      return callback({ responseHeaders: details.responseHeaders })
    }
    if (toolhivePort == null) {
      throw new Error('[content-security-policy] ToolHive port is not set')
    }
    return callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [getCspString(toolhivePort)],
      },
    })
  })

  try {
    tray = initTray({ toolHiveIsRunning: !!toolhiveProcess })
    console.log('System tray initialized successfully')
  } catch (error) {
    console.error('Failed to initialize system tray:', error)
  }

  // Non-Windows platforms: refresh tray icon when theme changes
  nativeTheme.on('updated', () => {
    if (tray && process.platform !== 'win32') {
      try {
        tray.destroy()
        tray = initTray({ toolHiveIsRunning: !!toolhiveProcess })
      } catch (error) {
        console.error('Failed to update tray after theme change:', error)
      }
    }
  })
})

// Hold the quit if any window closes on non-macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow()
  } else {
    mainWindow?.show()
  }
})

app.on('before-quit', (e) => blockQuit('before-quit', e))
app.on('will-quit', (e) => blockQuit('will-quit', e))

// Docker / Ctrl-C etc.
;['SIGTERM', 'SIGINT'].forEach((sig) =>
  process.on(sig as NodeJS.Signals, async () => {
    if (tearingDown) return
    tearingDown = true
    isQuitting = true
    console.log(`[${sig}] delaying exit for teardown…`)
    try {
      await stopAllServers(binPath, toolhivePort!)
    } finally {
      toolhiveProcess?.kill()
      tray?.destroy()
      process.exit(0)
    }
  })
)

ipcMain.handle('dark-mode:toggle', () => {
  nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark'
  return nativeTheme.shouldUseDarkColors
})

ipcMain.handle('dark-mode:system', () => {
  nativeTheme.themeSource = 'system'
  return nativeTheme.shouldUseDarkColors
})

ipcMain.handle(
  'dark-mode:set',
  (_event, theme: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = theme
    return nativeTheme.shouldUseDarkColors
  }
)

ipcMain.handle('dark-mode:get', () => ({
  shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
  themeSource: nativeTheme.themeSource,
}))

ipcMain.handle('get-auto-launch-status', () => getAutoLaunchStatus())

ipcMain.handle('set-auto-launch', (_event, enabled: boolean) => {
  setAutoLaunch(enabled)
  return getAutoLaunchStatus()
})

ipcMain.handle('show-app', () => {
  mainWindow?.show()
  mainWindow?.focus()
})

ipcMain.handle('hide-app', () => {
  mainWindow?.hide()
})

ipcMain.handle('quit-app', () => {
  app.quit()
})

ipcMain.handle('get-toolhive-port', () => toolhivePort)
