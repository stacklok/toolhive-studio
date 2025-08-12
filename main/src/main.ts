import {
  app,
  BrowserWindow,
  Tray,
  ipcMain,
  nativeTheme,
  session,
  shell,
  autoUpdater,
  dialog,
} from 'electron'
import path from 'node:path'
import { updateElectronApp } from 'update-electron-app'
import { existsSync, readFile } from 'node:fs'
import started from 'electron-squirrel-startup'
import * as Sentry from '@sentry/electron/main'
import { initTray, updateTrayStatus } from './system-tray'
import { showInDock, hideWindow } from './dock-utils'
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
import { getAppVersion, isOfficialReleaseBuild, pollWindowReady } from './util'
import { delay } from '../../utils/delay'
import Store from 'electron-store'
import { getHeaders } from './headers'
import {
  getFeatureFlag,
  enableFeatureFlag,
  disableFeatureFlag,
  getAllFeatureFlags,
  type FeatureFlagKey,
} from './feature-flags'
import {
  handleChatRequest,
  CHAT_PROVIDER_INFO,
  getChatSettings,
  saveChatSettings,
  clearChatSettings,
  discoverToolSupportedModels,
  type ChatRequest,
} from './chat-handler'

let tray: Tray | null = null
let isQuitting = false
let tearingDown = false
let pendingUpdateVersion: string | null = null
let updateState:
  | 'checking'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'none' = 'none'

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
updateElectronApp({ logger: log, notifyUser: false })

app.on('ready', () => {
  setTimeout(() => {
    if (
      !mainWindow ||
      app.isPackaged ||
      process.env.MOCK_UPDATE_SERVER !== 'true'
    ) {
      return
    }

    mainWindow.webContents.send('update-downloaded')
  }, 2000)
})

// ────────────────────────────────────────────────────────────────────────────
//  Auto-updater event handlers
// ────────────────────────────────────────────────────────────────────────────
autoUpdater.on('update-downloaded', (_, __, releaseName) => {
  log.info('[update] downloaded - showing dialog')
  pendingUpdateVersion = releaseName
  updateState = 'downloaded'
  if (!mainWindow) {
    log.error('MainWindow not available for update dialog')
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  const dialogOpts = {
    type: 'info' as const,
    buttons: ['Restart', 'Later'],
    cancelId: 1,
    defaultId: 0,
    title: `Release ${releaseName}`,
    message:
      process.platform === 'darwin'
        ? `Release ${releaseName}`
        : 'A new version has been downloaded.\nRestart the application to apply the updates.',
    detail:
      process.platform === 'darwin'
        ? 'A new version has been downloaded.\nRestart the application to apply the updates.'
        : `Ready to install ${releaseName}`,
    icon: undefined,
  }

  dialog
    .showMessageBox(mainWindow, dialogOpts)
    .then(async (returnValue) => {
      if (returnValue.response === 0) {
        log.info(
          `[update] installing update to version: ${releaseName || 'unknown'}`
        )
        updateState = 'installing'

        log.info('[update] removing quit listeners to avoid interference')
        app.removeAllListeners('before-quit')
        app.removeAllListeners('will-quit')

        isQuitting = true
        tearingDown = true

        try {
          log.info('[update] starting graceful shutdown before update...')

          mainWindow?.webContents.send('graceful-exit')

          const port = getToolhivePort()
          if (port) {
            await stopAllServers(binPath, port)
          }

          stopToolhive()

          tray?.destroy()

          log.info(
            '[update] all cleaned up, calling autoUpdater.quitAndInstall()...'
          )
          autoUpdater.quitAndInstall()
        } catch (error) {
          updateState = 'none'
          log.error('[update] error during graceful shutdown:', error)
          tray?.destroy()
          app.relaunch()
          app.quit()
        }
      } else {
        updateState = 'none'
        log.info(
          '[update] user deferred update installation - showing toast notification'
        )
        if (mainWindow) {
          mainWindow.webContents.send('update-downloaded')
        }
      }
    })
    .catch((error) => {
      log.error('[update] error showing dialog:', error)
    })
})

autoUpdater.on('checking-for-update', () => {
  log.info('[update] checking for updates...')
  updateState = 'checking'
})

autoUpdater.on('update-available', () => {
  updateState = 'downloading'
})

autoUpdater.on('update-not-available', () => {
  if (updateState === 'downloading') {
    log.warn('[update] update became unavailable during download - ignoring')
    return
  }
  updateState = 'none'
})

autoUpdater.on('error', (message) => {
  log.error('[update] there was a problem updating the application: ', message)
  log.info('[update] update state: ', updateState)
  log.info('[update] toolhive binary is running: ', isToolhiveRunning())
  updateState = 'none'
})

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
    if (shouldStartHidden || tray) {
      hideWindow(mainWindow)
    }
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting && tray) {
      event.preventDefault()
      hideWindow(mainWindow)
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
  updateState = 'none'
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

  mainWindow.webContents.once('did-finish-load', () => {
    if (!mainWindow) return

    if (updateState === 'none') {
      autoUpdater.checkForUpdates()
    }

    mainWindow.webContents.on('before-input-event', (event, input) => {
      const isCmdQ =
        process.platform === 'darwin' &&
        input.meta &&
        input.key.toLowerCase() === 'q'
      const isCtrlQ =
        process.platform !== 'darwin' &&
        input.control &&
        input.key.toLowerCase() === 'q'

      if (isCmdQ || isCtrlQ) {
        event.preventDefault()
        log.info('CmdOrCtrl+Q pressed, hiding window')
        hideWindow(mainWindow!)
      }
    })
  })

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
    showInDock()
    mainWindow?.show()
  }
})

app.on('will-finish-launching', () => {
  log.info('App will finish launching')
})

app.on('before-quit', (e) => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('show-quit-confirmation')
  }

  if (!isQuitting) {
    e.preventDefault()
  }
})
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
  showInDock()
  mainWindow?.show()
  mainWindow?.focus()
})

ipcMain.handle('hide-app', () => {
  if (mainWindow) {
    hideWindow(mainWindow)
  }
})

ipcMain.handle('quit-app', (e) => {
  blockQuit('before-quit', e)
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
  log.info(
    `[update] installing update and restarting application ${pendingUpdateVersion || 'unknown'}`
  )
  // Set a flag to indicate we're installing an update
  // This will prevent the graceful shutdown process
  isQuitting = true
  tearingDown = true
  updateState = 'installing'

  app.removeAllListeners('before-quit')
  app.removeAllListeners('will-quit')

  log.info('[update] starting graceful shutdown before update...')
  mainWindow?.webContents.send('graceful-exit')

  try {
    const port = getToolhivePort()
    if (port) {
      await stopAllServers(binPath, port).catch((err) => {
        log.error('[update] failed to stop servers during update: ', err)
      })
    }
  } catch (err) {
    log.error('[update] failed to get port during update: ', err)
  }

  // Stop ToolHive
  stopToolhive()

  // Destroy tray
  tray?.destroy()

  // Install update and restart
  log.info('[update] all cleaned up, calling autoUpdater.quitAndInstall()...')
  autoUpdater.quitAndInstall()
  return { success: true }
})

ipcMain.handle('is-update-in-progress', () => {
  log.debug(`[is-update-in-progress]: ${updateState}`)
  return updateState === 'installing'
})

ipcMain.handle('telemetry-headers', () => {
  return getHeaders()
})

ipcMain.handle('is-official-release-build', () => {
  return isOfficialReleaseBuild()
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
  return true
})

// Log file operations
ipcMain.handle(
  'get-main-log-content',
  async (): Promise<string | undefined> => {
    try {
      const logPath = path.join(app.getPath('logs'), 'main.log')
      if (!existsSync(logPath)) {
        log.warn(`Log file does not exist: ${logPath}`)
        return
      }

      const content = await new Promise<string>((resolve, reject) => {
        readFile(logPath, 'utf8', (err, data) => {
          if (err) reject(err)
          else resolve(data)
        })
      })

      return content
    } catch (error) {
      log.error('Failed to read log file:', error)
      return
    }
  }
)

// File/folder pickers for renderer
ipcMain.handle('dialog:select-file', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:select-folder', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// Feature flag IPC handlers
ipcMain.handle('feature-flags:get', (_event, key: FeatureFlagKey): boolean => {
  return getFeatureFlag(key)
})

ipcMain.handle('feature-flags:enable', (_event, key: FeatureFlagKey): void => {
  enableFeatureFlag(key)
})

ipcMain.handle('feature-flags:disable', (_event, key: FeatureFlagKey): void => {
  disableFeatureFlag(key)
})

ipcMain.handle('feature-flags:get-all', (): Record<FeatureFlagKey, boolean> => {
  return getAllFeatureFlags()
})

// ────────────────────────────────────────────────────────────────────────────
//  Chat IPC handlers
// ────────────────────────────────────────────────────────────────────────────

ipcMain.handle('chat:get-providers', () => {
  return CHAT_PROVIDER_INFO
})

ipcMain.handle('chat:stream', async (_event, request: ChatRequest) => {
  try {
    // handleChatRequest now returns the final message as JSON string
    const finalMessage = await handleChatRequest(request)

    return finalMessage
  } catch (error) {
    log.error('Chat request failed:', error)
    throw error
  }
})

// Chat settings store handlers
ipcMain.handle('chat:get-settings', (_, providerId: string) =>
  getChatSettings(providerId)
)
ipcMain.handle(
  'chat:save-settings',
  (
    _,
    providerId: string,
    settings: { apiKey: string; enabledTools: string[] }
  ) => saveChatSettings(providerId, settings)
)
ipcMain.handle('chat:clear-settings', (_, providerId?: string) =>
  clearChatSettings(providerId)
)
ipcMain.handle('chat:discover-models', () => discoverToolSupportedModels())
