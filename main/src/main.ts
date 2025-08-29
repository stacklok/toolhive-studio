import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  session,
  dialog,
} from 'electron'
import path from 'node:path'
import { existsSync, readFile } from 'node:fs'
import started from 'electron-squirrel-startup'
import * as Sentry from '@sentry/electron/main'
import { initTray, updateTrayStatus, safeTrayDestroy } from './system-tray'
import { showInDock } from './dock-utils'
import { setAutoLaunch, getAutoLaunchStatus } from './auto-launch'
import { createApplicationMenu } from './menu'
import {
  getMainWindow,
  isMainWindowValid,
  createMainWindow,
  showMainWindow,
  focusMainWindow,
  hideMainWindow,
  closeMainWindow,
  minimizeMainWindow,
  toggleMaximizeMainWindow,
  isMainWindowMaximized,
  sendToMainWindowRenderer,
  recreateMainWindowForShutdown,
} from './main-window'

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
  getToolhiveMcpPort,
} from './toolhive-manager'
import log from './logger'
import { getAppVersion, isOfficialReleaseBuild } from './util'
import { delay } from '../../utils/delay'
import {
  initAutoUpdate,
  resetUpdateState,
  checkForUpdates,
} from './auto-update'
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
  CHAT_PROVIDER_INFO,
  getChatSettings,
  saveChatSettings,
  clearChatSettings,
  getSelectedModel,
  saveSelectedModel,
  getMcpServerTools,
  getEnabledMcpTools,
  getEnabledMcpServersFromTools,
  saveEnabledMcpTools,
  discoverToolSupportedModels,
  fetchOpenRouterModels,
  getToolhiveMcpInfo,
  type ChatRequest,
} from './chat'
import { getWorkloadAvailableTools } from './utils/mcp-tools'
import {
  getQuittingState,
  setQuittingState,
  getTearingDownState,
  setTearingDownState,
  setTray,
  getTray,
} from './app-state'

const store = new Store<{
  isTelemetryEnabled: boolean
}>({ defaults: { isTelemetryEnabled: true } })

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  beforeSend: (event) => (store.get('isTelemetryEnabled', true) ? event : null),
})

// Environment variables are now handled in mainWindow.ts

log.info(`ToolHive binary path: ${binPath}`)
log.info(`Binary file exists: ${existsSync(binPath)}`)

/** Hold the quit, run teardown, then really exit. */
export async function blockQuit(source: string, event?: Electron.Event) {
  if (getTearingDownState()) return
  setTearingDownState(true)
  setQuittingState(true)
  log.info(`[${source}] initiating graceful teardown...`)

  if (event) {
    event.preventDefault()
  }

  try {
    const shutdownWindow = await recreateMainWindowForShutdown()

    if (shutdownWindow) {
      sendToMainWindowRenderer('graceful-exit')

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

    safeTrayDestroy(getTray())
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
    focusMainWindow()
  })
}

// ────────────────────────────────────────────────────────────────────────────
//  Windows-installer helper (Squirrel)
// ────────────────────────────────────────────────────────────────────────────
if (started) {
  app.quit()
}

// ────────────────────────────────────────────────────────────────────────────
//  Main-window management is now handled by MainWindowManager
// ────────────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  resetUpdateState()

  // Initialize tray first
  try {
    setTray(initTray({ toolHiveIsRunning: false })) // Start with false, will update after ToolHive starts
    log.info('System tray initialized successfully')
    // Setup application menu
    createApplicationMenu(getTray())
  } catch (error) {
    log.error('Failed to initialize system tray: ', error)
  }

  // Initialize auto-update system
  initAutoUpdate(
    () => getMainWindow(),
    () => createMainWindow()
  )

  // Start ToolHive with tray reference
  await startToolhive(getTray() || undefined)

  // Create main window
  try {
    const mainWindow = await createMainWindow()

    if (mainWindow) {
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
          try {
            hideMainWindow()
          } catch (error) {
            log.error('Failed to hide window on keyboard shortcut:', error)
          }
        }
      })

      mainWindow.webContents.once('did-finish-load', () => {
        log.info('Main window did-finish-load event triggered')
        checkForUpdates()
      })
    }
  } catch (error) {
    log.error('Failed to create main window:', error)
  }

  // Setup CSP headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (process.env.NODE_ENV === 'development') {
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
    if (getTray() && process.platform !== 'win32') {
      try {
        getTray()?.destroy()
        setTray(initTray({ toolHiveIsRunning: isToolhiveRunning() }))
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

app.on('activate', async () => {
  try {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow()
    } else {
      showInDock()
      await showMainWindow()
    }
  } catch (error) {
    log.error('Failed to handle app activation:', error)
  }
})

app.on('will-finish-launching', () => {
  log.info('App will finish launching')
})

app.on('before-quit', async (e) => {
  try {
    if (isMainWindowValid()) {
      await showMainWindow()
      sendToMainWindowRenderer('show-quit-confirmation')
    }
  } catch (error) {
    log.error('Failed to show quit confirmation:', error)
  }

  if (!getQuittingState()) {
    e.preventDefault()
  }
})
app.on('will-quit', (e) => blockQuit('will-quit', e))

// Docker / Ctrl-C etc.
;['SIGTERM', 'SIGINT'].forEach((sig) =>
  process.on(sig as NodeJS.Signals, async () => {
    if (getTearingDownState()) return
    setTearingDownState(true)
    setQuittingState(true)
    log.info(`[${sig}] delaying exit for teardown...`)
    try {
      const port = getToolhivePort()
      if (port) {
        await stopAllServers(binPath, port)
      }
    } finally {
      stopToolhive()
      safeTrayDestroy(getTray())
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
  if (getTray()) {
    updateTrayStatus(getTray()!, isToolhiveRunning())
  }
  // Update menu
  createApplicationMenu(getTray())
  return getAutoLaunchStatus()
})

ipcMain.handle('show-app', async () => {
  try {
    showInDock()
    await showMainWindow()
  } catch (error) {
    log.error('Failed to show app:', error)
  }
})

ipcMain.handle('hide-app', () => {
  try {
    hideMainWindow()
  } catch (error) {
    log.error('Failed to hide app:', error)
  }
})

ipcMain.handle('quit-app', (e) => {
  blockQuit('before-quit', e)
})

ipcMain.handle('get-toolhive-port', () => getToolhivePort())
ipcMain.handle('get-toolhive-mcp-port', () => getToolhiveMcpPort())
ipcMain.handle('is-toolhive-running', () => isToolhiveRunning())

// Window control handlers for custom title bar
ipcMain.handle('window-minimize', () => {
  try {
    minimizeMainWindow()
  } catch (error) {
    log.error('Failed to minimize window:', error)
  }
})

ipcMain.handle('window-maximize', () => {
  try {
    toggleMaximizeMainWindow()
  } catch (error) {
    log.error('Failed to maximize window:', error)
  }
})

ipcMain.handle('window-close', () => {
  try {
    closeMainWindow()
  } catch (error) {
    log.error('Failed to close window:', error)
  }
})

ipcMain.handle('window-is-maximized', () => {
  try {
    return isMainWindowMaximized()
  } catch (error) {
    log.error('Failed to check if window is maximized:', error)
    return false
  }
})

ipcMain.handle('check-container-engine', async () => {
  return await checkContainerEngine()
})

ipcMain.handle('restart-toolhive', async () => {
  try {
    await restartToolhive(getTray() || undefined)
    return { success: true }
  } catch (error) {
    log.error('Failed to restart ToolHive: ', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
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
  try {
    const mainWindow = getMainWindow()
    if (!mainWindow) return null

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  } catch (error) {
    log.error('Failed to show file dialog:', error)
    return null
  }
})

ipcMain.handle('dialog:select-folder', async () => {
  try {
    const mainWindow = getMainWindow()
    if (!mainWindow) return null

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  } catch (error) {
    log.error('Failed to show folder dialog:', error)
    return null
  }
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

ipcMain.handle('chat:get-providers', async () => {
  // Create a copy of the provider info to avoid modifying the original
  const providers = [...CHAT_PROVIDER_INFO]

  // For OpenRouter, fetch the latest models dynamically only if API key is available
  const openRouterIndex = providers.findIndex((p) => p.id === 'openrouter')
  if (openRouterIndex !== -1) {
    try {
      const openRouterSettings = getChatSettings('openrouter')

      // Only fetch models if user has provided an API key
      if (
        openRouterSettings.apiKey &&
        openRouterSettings.apiKey.trim() !== ''
      ) {
        const openRouterModels = await fetchOpenRouterModels()
        const originalProvider = providers[openRouterIndex]
        if (originalProvider) {
          providers[openRouterIndex] = {
            id: originalProvider.id,
            name: originalProvider.name,
            models: openRouterModels,
          }
        }
      }
      // If no API key, keep the original hardcoded models as fallback
    } catch (error) {
      log.error('Failed to fetch OpenRouter models, using fallback:', error)
      // Keep the original hardcoded models as fallback
    }
  }

  return providers
})

// Chat streaming endpoint - uses real-time IPC events
ipcMain.handle('chat:stream', async (event, request: ChatRequest) => {
  const streamId = `stream-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const { handleChatStreamRealtime } = await import('./chat')

  // Start streaming (non-blocking)
  handleChatStreamRealtime(request, streamId, event.sender)

  // Return the stream ID immediately
  return { streamId }
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

// Model selection persistence handlers
ipcMain.handle('chat:get-selected-model', () => getSelectedModel())
ipcMain.handle(
  'chat:save-selected-model',
  (_, provider: string, model: string) => saveSelectedModel(provider, model)
)

// MCP tools management handlers (single source of truth)
ipcMain.handle('chat:get-mcp-server-tools', (_, serverName?: string) =>
  getMcpServerTools(serverName)
)
ipcMain.handle('chat:get-enabled-mcp-tools', () => getEnabledMcpTools())
ipcMain.handle('chat:get-enabled-mcp-servers-from-tools', () =>
  getEnabledMcpServersFromTools()
)
ipcMain.handle(
  'chat:save-enabled-mcp-tools',
  (_, serverName: string, enabledTools: string[]) =>
    saveEnabledMcpTools(serverName, enabledTools)
)
ipcMain.handle('chat:get-toolhive-mcp-info', () => getToolhiveMcpInfo())

// Workload tools discovery handler
ipcMain.handle('utils:get-workload-available-tools', async (_, workload) =>
  getWorkloadAvailableTools(workload)
)
