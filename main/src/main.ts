import type { LanguageModelV2Usage } from '@ai-sdk/provider'
import type { UIMessage } from 'ai'
import { app, ipcMain, nativeTheme, dialog } from 'electron'
import started from 'electron-squirrel-startup'
import { existsSync, readFile } from 'node:fs'
import path from 'node:path'
import { registerAllEvents, blockQuit } from './app-events'
import { getCliValidationResult, setCliValidationResult } from './app-state'
import { setAutoLaunch, getAutoLaunchStatus } from './auto-launch'
import {
  getIsAutoUpdateEnabled,
  getLatestAvailableVersion,
  getUpdateState,
  manualUpdate,
  setAutoUpdateEnabled,
} from './auto-update'
import {
  getMcpServerTools,
  getToolhiveMcpInfo,
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
  createChatThread,
  getThreadMessagesForTransport,
  getThreadInfo,
  ensureThreadExists,
  type ChatRequest,
  type ChatSettingsThread,
  handleChatStreamRealtime,
} from './chat'
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
  validateCliAlignment,
  handleValidationResult,
  getCliAlignmentStatus,
  reinstallCliSymlink,
  repairCliSymlink,
} from './cli'
import { checkPathConfiguration } from './cli/path-configurator'
import { checkContainerEngine } from './container-engine'
import { writeSetting } from './db/writers/settings-writer'
import { registerProtocolWithSquirrel } from './deep-links'
import { showInDock } from './dock-utils'
import {
  getFeatureFlag,
  enableFeatureFlag,
  disableFeatureFlag,
  getAllFeatureFlags,
  type FeatureFlagKey,
  type FeatureFlagOptions,
} from './feature-flags'
import { getLastShutdownServers, clearShutdownHistory } from './graceful-exit'
import { getHeaders } from './headers'
import log from './logger'
import {
  getMainWindow,
  showMainWindow,
  hideMainWindow,
  closeMainWindow,
  minimizeMainWindow,
  toggleMaximizeMainWindow,
  isMainWindowMaximized,
} from './main-window'
import { createApplicationMenu } from './menu'
import {
  getSkipQuitConfirmation,
  setSkipQuitConfirmation,
} from './quit-confirmation'
import { initSentry } from './sentry'
import { enforceSingleInstance } from './single-instance'
import { updateTrayStatus } from './system-tray'
import { telemetryStore } from './telemetry-store'
import {
  restartToolhive,
  getToolhivePort,
  isToolhiveRunning,
  binPath,
  getToolhiveMcpPort,
  isUsingCustomPort,
} from './toolhive-manager'
import { getInstanceId, isOfficialReleaseBuild } from './util'
import { getWorkloadAvailableTools } from './utils/mcp-tools'

initSentry()

// Environment variables are now handled in mainWindow.ts

log.info(`ToolHive binary path: ${binPath}`)
log.info(`Binary file exists: ${existsSync(binPath)}`)

// ────────────────────────────────────────────────────────────────────────────
//  Single Instance Lock - Prevent multiple instances
// ────────────────────────────────────────────────────────────────────────────
enforceSingleInstance()

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
//  Register all app lifecycle events
//  (whenReady, window-all-closed, activate, before-quit, quit, etc.)
// ────────────────────────────────────────────────────────────────────────────
registerAllEvents()

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

ipcMain.handle('quit-app', () => {
  blockQuit('before-quit')
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
  return telemetryStore.get('isTelemetryEnabled', true)
})

ipcMain.handle('sentry.opt-out', (): boolean => {
  telemetryStore.set('isTelemetryEnabled', false)
  try {
    writeSetting('isTelemetryEnabled', 'false')
  } catch (err) {
    log.error('[DB] Failed to dual-write isTelemetryEnabled:', err)
  }
  return telemetryStore.get('isTelemetryEnabled', false)
})

ipcMain.handle('sentry.opt-in', (): boolean => {
  telemetryStore.set('isTelemetryEnabled', true)
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
