import {
  app,
  BrowserWindow,
  Tray,
  ipcMain,
  nativeTheme,
  session,
  shell,
  autoUpdater,
} from 'electron'
import path from 'node:path'
import { updateElectronApp } from 'update-electron-app'
import { existsSync } from 'node:fs'
import started from 'electron-squirrel-startup'
import * as Sentry from '@sentry/electron/main'
import { initTray, updateTrayStatus } from './system-tray'
import { setAutoLaunch, getAutoLaunchStatus } from './auto-launch'
import { createApplicationMenu } from './menu'
import { getCspString } from './csp'
import {
  stopAllServers,
  getLastShutdownServers,
  clearShutdownHistory,
} from './graceful-exit'
import { checkContainerEngine } from './container-engine'
import {
  startToolhive,
  restartToolhive,
  stopToolhive,
  getToolhivePort,
  isToolhiveRunning,
  binPath,
} from './toolhive-manager'
import log from './logger'
import { getAppVersion, pollWindowReady } from './util'
import { delay } from '../../utils/delay'

import Store from 'electron-store'

const store = new Store<{
  isTelemetryEnabled: boolean
}>({ defaults: { isTelemetryEnabled: true } })

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  beforeSend: (event) => (store.get('isTelemetryEnabled', true) ? event : null),
})

// Forge environment variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined
declare const MAIN_WINDOW_VITE_NAME: string

log.info(`ToolHive binary path: ${binPath}`)
log.info(`Binary file exists: ${existsSync(binPath)}`)

// this implements auto-update
updateElectronApp({ logger: log })

app.on('ready', () => {
  setTimeout(() => {
    if (
      !mainWindow ||
      app.isPackaged ||
      process.env.MOCK_UPDATE_SERVER !== 'true'
    ) {
      return
    }

    log.info('Simulating a new release for testing purposes')
    mainWindow.webContents.send('update-downloaded')
  }, 2000)
})

autoUpdater.on('update-downloaded', () => {
  if (!mainWindow) {
    return
  }

  log.info('Update downloaded — sending to renderer')
  mainWindow.webContents.send('update-downloaded')
})

autoUpdater.on('error', (message) => {
  log.error('There was a problem updating the application: ', message)
})

autoUpdater.checkForUpdates()

let tray: Tray | null = null
let isQuitting = false

let tearingDown = false

/** Hold the quit, run teardown, then really exit. */
export async function blockQuit(source: string, event?: Electron.Event) {
  if (tearingDown) return
  tearingDown = true
  isQuitting = true
  log.info(`[${source}] initiating graceful teardown...`)

  if (event) {
    event.preventDefault()
  }

  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      log.info('MainWindow destroyed, recreating for graceful shutdown...')
      mainWindow = createWindow()
    }

    if (mainWindow) {
      log.info('Showing window for graceful shutdown...')

      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }

      mainWindow.show()
      mainWindow.focus()

      await pollWindowReady(mainWindow)

      mainWindow?.webContents.send('graceful-exit')

      // Give renderer time to navigate to shutdown page
      await delay(500)
    }
  } catch (err) {
    log.error('Failed to send graceful-exit message: ', err)
  }

  try {
    const port = getToolhivePort()
    if (port) {
      await stopAllServers(binPath, port)
    }
  } catch (err) {
    log.error('Teardown failed: ', err)
  } finally {
    // Stop the embedded ToolHive server
    stopToolhive()

    tray?.destroy()
    app.quit()
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Single Instance Lock - Prevent multiple instances
// ────────────────────────────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  log.info('Another instance is already running. Exiting...')
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    log.info('Second instance attempted, focusing existing window')
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      mainWindow.show()
    }
  })
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

function getPlatformSpecificWindowOptions() {
  const platformConfigs = {
    darwin: {
      titleBarStyle: 'hidden' as const,
      trafficLightPosition: { x: 21, y: 24 },
    },
    win32: {
      frame: false, // Completely frameless for custom window controls
    },
    linux: {
      frame: false, // Frameless for custom controls
    },
  }

  return (
    platformConfigs[process.platform as keyof typeof platformConfigs] ||
    platformConfigs.linux
  )
}

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
    ...getPlatformSpecificWindowOptions(),
  })

  // Minimize-to-tray instead of close
  mainWindow.on('minimize', () => {
    if (shouldStartHidden || tray) mainWindow.hide()
  })
  mainWindow.on('close', (event) => {
    if (!isQuitting && tray) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

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

  // Open developer tools at startup in development
  if (isDevelopment && import.meta.env.VITE_ENABLE_AUTO_DEVTOOLS === 'true') {
    mainWindow.webContents.openDevTools()
  }

  return mainWindow
}

let mainWindow: BrowserWindow | null = null

app.whenReady().then(async () => {
  // Initialize tray first
  try {
    tray = initTray({ toolHiveIsRunning: false }) // Start with false, will update after ToolHive starts
    log.info('System tray initialized successfully')
    // Setup application menu
    createApplicationMenu(tray)
  } catch (error) {
    log.error('Failed to initialize system tray: ', error)
  }

  // Start ToolHive with tray reference
  await startToolhive(tray || undefined)

  // Create main window
  mainWindow = createWindow()

  // Setup CSP headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (isDevelopment) {
      return callback({ responseHeaders: details.responseHeaders })
    }
    const port = getToolhivePort()
    if (port == null) {
      throw new Error('[content-security-policy] ToolHive port is not set')
    }
    return callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          getCspString(port, import.meta.env.VITE_SENTRY_DSN),
        ],
      },
    })
  })

  // Non-Windows platforms: refresh tray icon when theme changes
  nativeTheme.on('updated', () => {
    if (tray && process.platform !== 'win32') {
      try {
        tray.destroy()
        tray = initTray({ toolHiveIsRunning: isToolhiveRunning() })
      } catch (error) {
        log.error('Failed to update tray after theme change: ', error)
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
    log.info(`[${sig}] delaying exit for teardown...`)
    try {
      const port = getToolhivePort()
      if (port) {
        await stopAllServers(binPath, port)
      }
    } finally {
      stopToolhive()
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
  // Update tray menu if exists
  if (tray) {
    updateTrayStatus(tray, isToolhiveRunning())
  }
  // Update menu
  createApplicationMenu(tray)
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

ipcMain.handle('get-toolhive-port', () => getToolhivePort())
ipcMain.handle('is-toolhive-running', () => isToolhiveRunning())

// Window control handlers for custom title bar
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle('window-close', () => {
  mainWindow?.close()
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false
})

ipcMain.handle('check-container-engine', async () => {
  return await checkContainerEngine()
})

ipcMain.handle('restart-toolhive', async () => {
  try {
    await restartToolhive(tray || undefined)
    return { success: true }
  } catch (error) {
    log.error('Failed to restart ToolHive: ', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

ipcMain.handle('install-update-and-restart', async () => {
  log.info('Installing update and restarting application')
  // Set a flag to indicate we're installing an update
  // This will prevent the graceful shutdown process
  isQuitting = true
  tearingDown = true

  // Stop ToolHive and servers immediately without graceful shutdown
  try {
    const port = getToolhivePort()
    if (port) {
      await stopAllServers(binPath, port).catch((err) => {
        log.error('Failed to stop servers during update: ', err)
      })
    }
  } catch (err) {
    log.error('Failed to get port during update: ', err)
  }

  // Stop ToolHive
  stopToolhive()

  // Destroy tray
  tray?.destroy()

  // Install update and restart
  autoUpdater.quitAndInstall()
  return { success: true }
})

// Shutdown store IPC handlers
ipcMain.handle('shutdown-store:get-last-servers', () => {
  return getLastShutdownServers()
})

ipcMain.handle('shutdown-store:clear-history', () => {
  clearShutdownHistory()
  return { success: true }
})

ipcMain.handle('get-app-version', () => {
  return getAppVersion()
})

// ────────────────────────────────────────────────────────────────────────────
//  Sentry IPC handlers
// ────────────────────────────────────────────────────────────────────────────

ipcMain.handle('sentry.is-enabled', () => {
  return store.get('isTelemetryEnabled', true)
})

ipcMain.handle('sentry.opt-out', (): boolean => {
  store.set('isTelemetryEnabled', false)
  return store.get('isTelemetryEnabled', false)
})

ipcMain.handle('sentry.opt-in', (): boolean => {
  store.set('isTelemetryEnabled', true)
  return store.get('isTelemetryEnabled', true)
})
