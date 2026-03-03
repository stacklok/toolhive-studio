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
import {
  handleDeepLink,
  registerProtocolWithSquirrel,
  extractDeepLinkFromArgs,
} from './deep-links'
import * as Sentry from '@sentry/electron/main'
import { initTray, updateTrayStatus, safeTrayDestroy } from './system-tray'
import { showInDock } from './dock-utils'
import { setAutoLaunch, getAutoLaunchStatus } from './auto-launch'
import { createApplicationMenu } from './menu'
import {
  getMainWindow,
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
  isUsingCustomPort,
} from './toolhive-manager'
import log from './logger'
import { getInstanceId, isOfficialReleaseBuild } from './util'
import { delay } from '../../utils/delay'
import {
  getIsAutoUpdateEnabled,
  getLatestAvailableVersion,
  getUpdateState,
  initAutoUpdate,
  manualUpdate,
  resetUpdateState,
  setAutoUpdateEnabled,
} from './auto-update'
import { telemetryStore } from './telemetry-store'
import { getHeaders } from './headers'
import {
  getFeatureFlag,
  enableFeatureFlag,
  disableFeatureFlag,
  getAllFeatureFlags,
  type FeatureFlagKey,
  type FeatureFlagOptions,
} from './feature-flags'
import {
  validateCliAlignment,
  handleValidationResult,
  getCliAlignmentStatus,
  reinstallCliSymlink,
  repairCliSymlink,
} from './cli'
import { checkPathConfiguration } from './cli/path-configurator'
import {
  discoverToolSupportedModels,
  fetchProviderModelsHandler,
  getAllProvidersHandler,
} from './chat/providers'
import {
  getChatSettings,
  clearChatSettings,
  getSelectedModel,
  saveSelectedModel,
  getEnabledMcpTools,
  getEnabledMcpServersFromTools,
  saveEnabledMcpTools,
  handleSaveSettings,
} from './chat/settings-storage'
import {
  getMcpServerTools,
  getToolhiveMcpInfo,
  // Thread storage functions
  createThread,
  getThread,
  getAllThreads,
  updateThread,
  deleteThread,
  clearAllThreads,
  getThreadCount,
  addMessageToThread,
  updateThreadMessages,
  getActiveThreadId,
  setActiveThreadId,
  // Thread integration functions
  createChatThread,
  getThreadMessagesForTransport,
  getThreadInfo,
  ensureThreadExists,
  type ChatRequest,
  type ChatSettingsThread,
  handleChatStreamRealtime,
} from './chat'
import type { LanguageModelV2Usage } from '@ai-sdk/provider'
import { getWorkloadAvailableTools } from './utils/mcp-tools'
import {
  getQuittingState,
  setQuittingState,
  getTearingDownState,
  setTearingDownState,
  getTray,
  getCliValidationResult,
  setCliValidationResult,
} from './app-state'
import type { UIMessage } from 'ai'
import {
  showNativeQuitConfirmation,
  getSkipQuitConfirmation,
  setSkipQuitConfirmation,
} from './quit-confirmation'

import { writeSetting } from './db/writers/settings-writer'
import { getDb, closeDb } from './db/database'
import { runMigrations } from './db/migrator'
import { reconcileFromStore } from './db/reconcile-from-store'

const isE2E = process.env.TOOLHIVE_E2E === 'true'

const store = telemetryStore

Sentry.init({
  dsn: isE2E ? undefined : import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 1.0,
  // It will send errors, exceptions and captured messages to Sentry only if the user has enabled telemetry
  beforeSend: (event) => (store.get('isTelemetryEnabled', true) ? event : null),
  // It will send transactions to Sentry only if the user has enabled telemetry
  beforeSendTransaction: async (transaction) => {
    if (!store.get('isTelemetryEnabled', true)) {
      return null
    }
    if (!transaction?.contexts?.trace) return null

    const instanceId = await getInstanceId()
    const trace = transaction.contexts.trace

    return {
      ...transaction,
      contexts: {
        ...transaction.contexts,
        trace: {
          ...trace,
          data: {
            ...transaction.contexts.trace.data,
            'custom.user_id': instanceId,
            auto_launch_status: `${getAutoLaunchStatus()}`,
          },
        },
      },
    }
  },
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

    safeTrayDestroy()
    app.quit()
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Single Instance Lock - Prevent multiple instances
// ────────────────────────────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // This is the second instance (e.g. launched by a deep link or duplicate click).
  // The first instance handles the deep link via the 'second-instance' event.
  // We use process.exit(0) instead of app.quit() because quit() is async —
  // its lifecycle events let app.whenReady() fire and briefly create a window.
  log.info('Another instance is already running. Exiting...')
  process.exit(0)
} else {
  app.on('second-instance', (_event, argv) => {
    log.info(
      `[deep-link] second-instance event received with argv: ${argv.join(' ')}`
    )
    // On Windows/Linux, deep link URL is passed as a command line argument
    const deepLinkUrl = extractDeepLinkFromArgs(argv)
    if (deepLinkUrl) {
      handleDeepLink(deepLinkUrl) // focuses window internally
    } else {
      focusMainWindow()
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
//  Deep Link Protocol Registration
// ────────────────────────────────────────────────────────────────────────────
registerProtocolWithSquirrel()

// ────────────────────────────────────────────────────────────────────────────
//  Main-window management is now handled by MainWindowManager
// ────────────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Initialize SQLite database, run migrations, and reconcile from electron-store
  try {
    getDb()
    runMigrations()
    reconcileFromStore()
  } catch (err) {
    log.error('[DB] Database initialization failed:', err)
  }

  resetUpdateState()

  // ────────────────────────────────────────────────────────────────────────────
  //  CLI Alignment Validation (THV-0020)
  //  Skip in dev mode since bundled CLI may not exist.
  //  Validation result is stored for renderer to query - renderer shows UI for
  //  issues that require user interaction (external CLI, broken/tampered symlink).
  //  Set FORCE_CLI_VALIDATION=true to test validation in dev mode.
  // ────────────────────────────────────────────────────────────────────────────
  const shouldValidateCli =
    app.isPackaged || process.env.FORCE_CLI_VALIDATION === 'true'
  if (shouldValidateCli) {
    const validation = await validateCliAlignment()
    const result = await handleValidationResult(validation)
    setCliValidationResult(result)
    log.info(`CLI validation result: ${result.status}`)
  } else {
    log.info('Skipping CLI alignment validation in dev mode')
    setCliValidationResult({ status: 'valid' })
  }

  // Initialize tray first
  try {
    initTray({ toolHiveIsRunning: false }) // Start with false, will update after ToolHive starts
    log.info('System tray initialized successfully')
    // Setup application menu
    createApplicationMenu()
  } catch (error) {
    log.error('Failed to initialize system tray: ', error)
  }

  // Initialize auto-update system
  initAutoUpdate({
    mainWindowGetter: () => getMainWindow(),
    windowCreator: () => createMainWindow(),
  })

  // Start ToolHive with tray reference
  await startToolhive()

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
      })

      // Windows-specific: Handle system shutdown/restart/logout
      if (process.platform === 'win32') {
        mainWindow.on('session-end', (event) => {
          log.info(
            `[session-end] Windows session ending (reasons: ${event.reasons.join(', ')}), forcing cleanup...`
          )
          stopToolhive()
          safeTrayDestroy()
        })
      }
    }
  } catch (error) {
    log.error('Failed to create main window:', error)
  }

  // Handle deep link URL from initial cold launch (Windows/Linux).
  // On macOS this is handled by the 'open-url' event in will-finish-launching.
  if (process.platform !== 'darwin') {
    const initialDeepLink = extractDeepLinkFromArgs(process.argv)
    if (initialDeepLink) {
      log.info(`[deep-link] Cold start with deep link: ${initialDeepLink}`)
      // TODO: Evaluate if pollWindowReady is sufficient for cold start or if
      // we need an explicit readiness signal from the renderer
      handleDeepLink(initialDeepLink)
    }
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
        initTray({ toolHiveIsRunning: isToolhiveRunning() })
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

  // macOS: deep links arrive via open-url event, not process.argv
  app.on('open-url', (event, url) => {
    event.preventDefault()
    log.info(`[deep-link] open-url event received: ${url}`)
    handleDeepLink(url)
  })
})

app.on('before-quit', async (e) => {
  // Already tearing down – let the quit proceed
  if (getTearingDownState()) return

  // Already in quitting state (blockQuit was called) – let it proceed
  if (getQuittingState()) return

  // Prevent the default quit synchronously so the app stays alive
  // while the native dialog is shown. This is critical during OS
  // shutdown: the OS sees the modal dialog and will not force-kill.
  e.preventDefault()

  // Show the native confirmation dialog (async to support the
  // "Don't ask me again" checkbox, which only the async variant offers).
  let confirmed = false
  try {
    confirmed = await showNativeQuitConfirmation()
  } catch (error) {
    // If the dialog fails (e.g. during OS shutdown), fall back to
    // proceeding with quit rather than leaving it blocked.
    log.error(
      '[before-quit] Failed to show quit confirmation dialog, proceeding with quit',
      error
    )
    confirmed = true
  }

  if (!confirmed) {
    log.info('[before-quit] User cancelled quit')
    return
  }

  blockQuit('before-quit')
})
app.on('will-quit', (e) => blockQuit('will-quit', e))

app.on('quit', () => {
  log.info('[quit event] Ensuring ToolHive cleanup...')
  // Only cleanup if not already tearing down to avoid double cleanup
  if (!getTearingDownState()) {
    stopToolhive()
    safeTrayDestroy()
  }
  closeDb()
})

// Docker / Ctrl-C etc.
;['SIGTERM', 'SIGINT'].forEach((sig) =>
  process.on(sig, async () => {
    log.info(`[${sig}] start...`)
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
      safeTrayDestroy()
      process.exit(0)
    }
  })
)

process.on('exit', (code) => {
  log.info(`[process exit] code=${code}, ensuring ToolHive is stopped...`)
  // Note: Only synchronous operations work here, so we force immediate SIGKILL
  stopToolhive({ force: true })
})

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
  updateTrayStatus(isToolhiveRunning())
  // Update menu
  createApplicationMenu()
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

ipcMain.handle('get-skip-quit-confirmation', () => getSkipQuitConfirmation())
ipcMain.handle('set-skip-quit-confirmation', (_e, skip: boolean) =>
  setSkipQuitConfirmation(skip)
)

ipcMain.handle('get-toolhive-port', () => getToolhivePort())
ipcMain.handle('get-toolhive-mcp-port', () => getToolhiveMcpPort())
ipcMain.handle('is-toolhive-running', () => isToolhiveRunning())
ipcMain.handle('is-using-custom-port', () => isUsingCustomPort())

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
    await restartToolhive()
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

// ────────────────────────────────────────────────────────────────────────────
//  Sentry IPC handlers
// ────────────────────────────────────────────────────────────────────────────

ipcMain.handle('sentry.is-enabled', () => {
  return store.get('isTelemetryEnabled', true)
})

ipcMain.handle('sentry.opt-out', (): boolean => {
  store.set('isTelemetryEnabled', false)
  try {
    writeSetting('isTelemetryEnabled', 'false')
  } catch (err) {
    log.error('[DB] Failed to dual-write isTelemetryEnabled:', err)
  }
  return store.get('isTelemetryEnabled', false)
})

ipcMain.handle('sentry.opt-in', (): boolean => {
  store.set('isTelemetryEnabled', true)
  try {
    writeSetting('isTelemetryEnabled', 'true')
  } catch (err) {
    log.error('[DB] Failed to dual-write isTelemetryEnabled:', err)
  }
  return true
})

ipcMain.handle('get-instance-id', async () => {
  const instanceId = await getInstanceId()
  return instanceId
})

// ────────────────────────────────────────────────────────────────────────────
//  Auto-update IPC handlers
// ────────────────────────────────────────────────────────────────────────────

ipcMain.handle('auto-update:set', async (_, enabled: boolean) => {
  setAutoUpdateEnabled(enabled)
  return enabled
})

ipcMain.handle('auto-update:get', () => {
  return getIsAutoUpdateEnabled()
})

ipcMain.handle('manual-update', async () => {
  log.info('[update] triggered manual update')
  manualUpdate()
})

ipcMain.handle('get-app-version', async () => {
  const versionInfo = await getLatestAvailableVersion()
  return versionInfo
})

ipcMain.handle('get-update-state', async () => {
  return getUpdateState()
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

ipcMain.handle(
  'feature-flags:get-all',
  (): Record<FeatureFlagKey, FeatureFlagOptions & { enabled: boolean }> => {
    return getAllFeatureFlags()
  }
)

// ────────────────────────────────────────────────────────────────────────────
//  Chat IPC handlers
// ────────────────────────────────────────────────────────────────────────────

ipcMain.handle(
  'chat:fetch-provider-models',
  (_, providerId: string, tempCredential?: string) =>
    fetchProviderModelsHandler(providerId, tempCredential)
)

ipcMain.handle('chat:get-providers', () => getAllProvidersHandler())

// Chat streaming endpoint - uses real-time IPC events
ipcMain.handle('chat:stream', async (event, request: ChatRequest) => {
  const streamId = `stream-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  // Start streaming (non-blocking)
  handleChatStreamRealtime(request, streamId, event.sender)

  // Return the stream ID immediately
  return { streamId }
})

// Chat settings store handlers
ipcMain.handle('chat:get-settings', (_, providerId: string) =>
  getChatSettings(providerId as Parameters<typeof getChatSettings>[0])
)
ipcMain.handle(
  'chat:save-settings',
  (
    _,
    providerId: string,
    settings:
      | { apiKey: string; enabledTools: string[] }
      | { endpointURL: string; enabledTools: string[] }
  ) => handleSaveSettings(providerId, settings)
)
ipcMain.handle('chat:clear-settings', (_, providerId?: string) =>
  clearChatSettings(providerId as Parameters<typeof clearChatSettings>[0])
)
ipcMain.handle('chat:discover-models', () => discoverToolSupportedModels())

// Model selection persistence handlers
ipcMain.handle('chat:get-selected-model', () => getSelectedModel())
ipcMain.handle(
  'chat:save-selected-model',
  (_, provider: string, model: string) => saveSelectedModel(provider, model)
)

// MCP tools management handlers (single source of truth)
ipcMain.handle('chat:get-mcp-server-tools', (_, serverName: string) =>
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

// ────────────────────────────────────────────────────────────────────────────
//  Chat Threads Storage IPC handlers
// ────────────────────────────────────────────────────────────────────────────

// Thread management
ipcMain.handle(
  'chat:create-thread',
  (
    _,
    title?: string,
    initialMessages?: UIMessage<{
      createdAt?: number
      model?: string
      totalUsage?: LanguageModelV2Usage
      responseTime?: number
      finishReason?: string
    }>[]
  ) => createThread(title, initialMessages)
)
ipcMain.handle('chat:get-thread', (_, threadId: string) => getThread(threadId))
ipcMain.handle('chat:get-all-threads', () => getAllThreads())
ipcMain.handle(
  'chat:update-thread',
  (
    _,
    threadId: string,
    updates: Partial<Omit<ChatSettingsThread, 'id' | 'createdAt'>>
  ) => updateThread(threadId, updates)
)
ipcMain.handle('chat:delete-thread', (_, threadId: string) =>
  deleteThread(threadId)
)
ipcMain.handle('chat:clear-all-threads', () => clearAllThreads())
ipcMain.handle('chat:get-thread-count', () => getThreadCount())

// Message management
ipcMain.handle(
  'chat:add-message-to-thread',
  (
    _,
    threadId: string,
    message: UIMessage<{
      createdAt?: number
      model?: string
      totalUsage?: LanguageModelV2Usage
      responseTime?: number
      finishReason?: string
    }>
  ) => addMessageToThread(threadId, message)
)
ipcMain.handle(
  'chat:update-thread-messages',
  (
    _,
    threadId: string,
    messages: UIMessage<{
      createdAt?: number
      model?: string
      totalUsage?: LanguageModelV2Usage
      responseTime?: number
      finishReason?: string
    }>[]
  ) => updateThreadMessages(threadId, messages)
)

// Active thread management
ipcMain.handle('chat:get-active-thread-id', () => getActiveThreadId())
ipcMain.handle('chat:set-active-thread-id', (_, threadId?: string) =>
  setActiveThreadId(threadId)
)

// High-level thread integration
ipcMain.handle('chat:create-chat-thread', (_, title?: string) =>
  createChatThread(title)
)
ipcMain.handle(
  'chat:get-thread-messages-for-transport',
  (_, threadId: string) => getThreadMessagesForTransport(threadId)
)
ipcMain.handle('chat:get-thread-info', (_, threadId: string) =>
  getThreadInfo(threadId)
)
ipcMain.handle(
  'chat:ensure-thread-exists',
  (_, threadId?: string, title?: string) => ensureThreadExists(threadId, title)
)

// Workload tools discovery handler
ipcMain.handle('utils:get-workload-available-tools', async (_, workload) =>
  getWorkloadAvailableTools(workload)
)

// ────────────────────────────────────────────────────────────────────────────
//  CLI Alignment IPC handlers (THV-0020)
// ────────────────────────────────────────────────────────────────────────────

ipcMain.handle('cli-alignment:get-status', () => getCliAlignmentStatus())

ipcMain.handle('cli-alignment:reinstall', () => reinstallCliSymlink())

ipcMain.handle('cli-alignment:get-path-status', () => checkPathConfiguration())

// Get the stored validation result from startup
ipcMain.handle('cli-alignment:get-validation-result', () =>
  getCliValidationResult()
)

// Re-run validation (e.g., after user uninstalls external CLI)
ipcMain.handle('cli-alignment:validate', async () => {
  const validation = await validateCliAlignment()
  const result = await handleValidationResult(validation)
  setCliValidationResult(result)
  return result
})

// Repair broken or tampered symlink
ipcMain.handle('cli-alignment:repair', async () => {
  const repairResult = await repairCliSymlink()
  if (repairResult.success) {
    // Re-validate after repair
    const validation = await validateCliAlignment()
    const result = await handleValidationResult(validation)
    setCliValidationResult(result)
    return { repairResult, validationResult: result }
  }
  return { repairResult, validationResult: getCliValidationResult() }
})
