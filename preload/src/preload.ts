// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'
import type { CoreWorkload } from '@common/api/generated/types.gen'
import type {
  AvailableServer,
  ChatUIMessage,
  ChatRequest,
} from '../../main/src/chat/types'
import { TOOLHIVE_VERSION } from '../../utils/constants'
import type { UIMessage } from 'ai'
import type { LanguageModelV2Usage } from '@ai-sdk/provider'
import type { FeatureFlagOptions } from '../../main/src/feature-flags'
import type { UpdateState } from '../../main/src/auto-update'
import type { ValidationResult } from '@common/types/cli'
import type { ComplianceReport } from '@common/types/mcp-compliance'
import type { NavigateTarget } from '@common/deep-links'

// Expose auto-launch functionality to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Auto-launch management
  getAutoLaunchStatus: () => ipcRenderer.invoke('get-auto-launch-status'),
  setAutoLaunch: (enabled: boolean) =>
    ipcRenderer.invoke('set-auto-launch', enabled),

  // App control
  showApp: () => ipcRenderer.invoke('show-app'),
  hideApp: () => ipcRenderer.invoke('hide-app'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  isUpdateInProgress: () => ipcRenderer.invoke('is-update-in-progress'),

  // App version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isOfficialReleaseBuild: () => ipcRenderer.invoke('is-official-release-build'),
  getTelemetryHeaders: () => ipcRenderer.invoke('telemetry-headers'),

  getInstanceId: () => ipcRenderer.invoke('get-instance-id'),

  // ToolHive port
  getToolhivePort: () => ipcRenderer.invoke('get-toolhive-port'),
  getToolhiveMcpPort: () => ipcRenderer.invoke('get-toolhive-mcp-port'),
  getToolhiveVersion: () => TOOLHIVE_VERSION,
  // ToolHive is running
  isToolhiveRunning: () => ipcRenderer.invoke('is-toolhive-running'),
  isUsingCustomPort: () => ipcRenderer.invoke('is-using-custom-port'),

  // Container engine check
  checkContainerEngine: () => ipcRenderer.invoke('check-container-engine'),

  // ToolHive restart
  restartToolhive: () => ipcRenderer.invoke('restart-toolhive'),

  // Update installation
  installUpdateAndRestart: () =>
    ipcRenderer.invoke('install-update-and-restart'),
  isAutoUpdateEnabled: () => ipcRenderer.invoke('auto-update:get'),
  setAutoUpdate: (enabled: boolean) =>
    ipcRenderer.invoke('auto-update:set', enabled),
  getUpdateState: () => ipcRenderer.invoke('get-update-state'),
  manualUpdate: () => ipcRenderer.invoke('manual-update'),

  // Theme management
  darkMode: {
    toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
    system: () => ipcRenderer.invoke('dark-mode:system'),
    set: (theme: 'light' | 'dark' | 'system') =>
      ipcRenderer.invoke('dark-mode:set', theme),
    get: () => ipcRenderer.invoke('dark-mode:get'),
  },

  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  platform: process.platform,

  // Server shutdown
  onServerShutdown: (callback: () => void) => {
    ipcRenderer.on('graceful-exit', callback)
    return () => {
      ipcRenderer.removeListener('graceful-exit', callback)
    }
  },

  // Deep link navigation — main process resolves the deep link to a
  // navigation target ({ to, params }) and sends it over IPC.
  onDeepLinkNavigation: (callback: (target: NavigateTarget) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      target: NavigateTarget
    ) => callback(target)
    ipcRenderer.on('deep-link-navigation', listener)
    return () => {
      ipcRenderer.removeListener('deep-link-navigation', listener)
    }
  },

  // File/folder pickers
  selectFile: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-file'),
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-folder'),

  // Quit confirmation preference (stored in electron-store on main process)
  getSkipQuitConfirmation: (): Promise<boolean> =>
    ipcRenderer.invoke('get-skip-quit-confirmation'),
  setSkipQuitConfirmation: (skip: boolean): Promise<void> =>
    ipcRenderer.invoke('set-skip-quit-confirmation', skip),

  sentry: {
    isEnabled: () => ipcRenderer.invoke('sentry.is-enabled'),
    optIn: () => ipcRenderer.invoke('sentry.opt-in'),
    optOut: () => ipcRenderer.invoke('sentry.opt-out'),
  },

  // Log file operations
  getMainLogContent: () => ipcRenderer.invoke('get-main-log-content'),

  // Window controls
  windowControls: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  },

  onUpdateDownloaded: (
    callback: (_event: Electron.IpcRendererEvent) => void
  ) => {
    ipcRenderer.on('update-downloaded', callback)
    return () => {
      ipcRenderer.removeListener('update-downloaded', callback)
    }
  },

  // Shutdown store
  shutdownStore: {
    getLastShutdownServers: () =>
      ipcRenderer.invoke('shutdown-store:get-last-servers'),
    clearShutdownHistory: () =>
      ipcRenderer.invoke('shutdown-store:clear-history'),
  },

  // Feature flags
  featureFlags: {
    get: (key: string) => ipcRenderer.invoke('feature-flags:get', key),
    enable: (key: string) => ipcRenderer.invoke('feature-flags:enable', key),
    disable: (key: string) => ipcRenderer.invoke('feature-flags:disable', key),
    getAll: () => ipcRenderer.invoke('feature-flags:get-all'),
  },

  // Chat functionality
  chat: {
    getProviders: () => ipcRenderer.invoke('chat:get-providers'),
    fetchProviderModels: (providerId: string, tempCredential?: string) =>
      ipcRenderer.invoke(
        'chat:fetch-provider-models',
        providerId,
        tempCredential
      ),
    stream: (request: ChatRequest) =>
      ipcRenderer.invoke('chat:stream', request) as Promise<{
        streamId: string
      }>,
    getSettings: (providerId: string) =>
      ipcRenderer.invoke('chat:get-settings', providerId),
    saveSettings: (
      providerId: string,
      settings:
        | { apiKey: string; enabledTools: string[] }
        | { endpointURL: string; enabledTools: string[] }
    ) => ipcRenderer.invoke('chat:save-settings', providerId, settings),
    clearSettings: (providerId?: string) =>
      ipcRenderer.invoke('chat:clear-settings', providerId),
    discoverModels: () => ipcRenderer.invoke('chat:discover-models'),
    getSelectedModel: () => ipcRenderer.invoke('chat:get-selected-model'),
    saveSelectedModel: (provider: string, model: string) =>
      ipcRenderer.invoke('chat:save-selected-model', provider, model),
    getMcpServerTools: (serverName: string) =>
      ipcRenderer.invoke('chat:get-mcp-server-tools', serverName),
    getEnabledMcpTools: () => ipcRenderer.invoke('chat:get-enabled-mcp-tools'),
    getEnabledMcpServersFromTools: () =>
      ipcRenderer.invoke('chat:get-enabled-mcp-servers-from-tools'),
    saveEnabledMcpTools: (serverName: string, enabledTools: string[]) =>
      ipcRenderer.invoke(
        'chat:save-enabled-mcp-tools',
        serverName,
        enabledTools
      ),
    getToolhiveMcpInfo: () => ipcRenderer.invoke('chat:get-toolhive-mcp-info'),

    // Thread management
    createThread: (title?: string, initialMessages?: unknown[]) =>
      ipcRenderer.invoke('chat:create-thread', title, initialMessages),
    getThread: (threadId: string) =>
      ipcRenderer.invoke('chat:get-thread', threadId),
    getAllThreads: () => ipcRenderer.invoke('chat:get-all-threads'),
    updateThread: (threadId: string, updates: unknown) =>
      ipcRenderer.invoke('chat:update-thread', threadId, updates),
    deleteThread: (threadId: string) =>
      ipcRenderer.invoke('chat:delete-thread', threadId),
    clearAllThreads: () => ipcRenderer.invoke('chat:clear-all-threads'),
    getThreadCount: () => ipcRenderer.invoke('chat:get-thread-count'),

    // Message management
    addMessageToThread: (threadId: string, message: unknown) =>
      ipcRenderer.invoke('chat:add-message-to-thread', threadId, message),
    updateThreadMessages: (threadId: string, messages: ChatUIMessage[]) =>
      ipcRenderer.invoke('chat:update-thread-messages', threadId, messages),

    // Active thread management
    getActiveThreadId: () => ipcRenderer.invoke('chat:get-active-thread-id'),
    setActiveThreadId: (threadId?: string) =>
      ipcRenderer.invoke('chat:set-active-thread-id', threadId),

    // High-level integration
    createChatThread: (title?: string, initialUserMessage?: string) =>
      ipcRenderer.invoke('chat:create-chat-thread', title, initialUserMessage),
    getThreadMessagesForTransport: (threadId: string) =>
      ipcRenderer.invoke('chat:get-thread-messages-for-transport', threadId),
    getThreadInfo: (threadId: string) =>
      ipcRenderer.invoke('chat:get-thread-info', threadId),
    ensureThreadExists: (threadId?: string, title?: string) =>
      ipcRenderer.invoke('chat:ensure-thread-exists', threadId, title),
  },

  // Utility functions
  utils: {
    getWorkloadAvailableTools: (workload: unknown) =>
      ipcRenderer.invoke('utils:get-workload-available-tools', workload),
  },

  // MCP Compliance
  mcpCompliance: {
    runChecks: (serverName: string) =>
      ipcRenderer.invoke('mcp-compliance:run-checks', serverName),
  },

  // CLI Alignment (THV-0020)
  cliAlignment: {
    getStatus: () => ipcRenderer.invoke('cli-alignment:get-status'),
    reinstall: () => ipcRenderer.invoke('cli-alignment:reinstall'),
    getPathStatus: () => ipcRenderer.invoke('cli-alignment:get-path-status'),
    getValidationResult: () =>
      ipcRenderer.invoke('cli-alignment:get-validation-result'),
    validate: () => ipcRenderer.invoke('cli-alignment:validate'),
    repair: () => ipcRenderer.invoke('cli-alignment:repair'),
  },

  // IPC event listeners for streaming
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => listener(...args))
  },
  removeListener: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, listener)
  },
})

export interface ElectronAPI {
  getAppVersion: () => Promise<{
    currentVersion: string
    latestVersion: string
    isNewVersionAvailable: boolean
  }>
  isOfficialReleaseBuild: () => Promise<boolean>
  getTelemetryHeaders: () => Promise<Record<string, string>>
  isUpdateInProgress: () => Promise<boolean>
  getAutoLaunchStatus: () => Promise<boolean>
  setAutoLaunch: (enabled: boolean) => Promise<boolean>
  showApp: () => Promise<void>
  hideApp: () => Promise<void>
  quitApp: () => Promise<void>
  getToolhivePort: () => Promise<number | undefined>
  getToolhiveMcpPort: () => Promise<number | undefined>
  getToolhiveVersion: () => string
  isToolhiveRunning: () => Promise<boolean>
  isUsingCustomPort: () => Promise<boolean>
  checkContainerEngine: () => Promise<{
    docker: boolean
    podman: boolean
    rancherDesktop: boolean
    available: boolean
  }>
  restartToolhive: () => Promise<{
    success: boolean
    error?: string
  }>
  installUpdateAndRestart: () => Promise<{ success: boolean }>
  isAutoUpdateEnabled: () => Promise<boolean>
  setAutoUpdate: (enabled: boolean) => Promise<boolean>
  darkMode: {
    toggle: () => Promise<boolean>
    system: () => Promise<boolean>
    set: (theme: 'light' | 'dark' | 'system') => Promise<boolean>
    get: () => Promise<{
      shouldUseDarkColors: boolean
      themeSource: 'system' | 'light' | 'dark'
    }>
  }
  sentry: {
    isEnabled: () => Promise<boolean>
    optIn: () => Promise<boolean>
    optOut: () => Promise<boolean>
  }
  getInstanceId: () => Promise<string>
  getMainLogContent: () => Promise<string>
  isMac: boolean
  isWindows: boolean
  isLinux: boolean
  platform: NodeJS.Platform
  onServerShutdown: (callback: () => void) => () => void
  onDeepLinkNavigation: (
    callback: (target: NavigateTarget) => void
  ) => () => void
  getSkipQuitConfirmation: () => Promise<boolean>
  setSkipQuitConfirmation: (skip: boolean) => Promise<void>
  windowControls: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
  }
  onUpdateDownloaded: (
    callback: (_event: Electron.IpcRendererEvent) => void
  ) => () => void
  onUpdateAvailable: (
    callback: (_event: Electron.IpcRendererEvent) => void
  ) => () => void
  onUpdateChecking: (
    callback: (_event: Electron.IpcRendererEvent) => void
  ) => () => void
  onUpdateNotAvailable: (
    callback: (_event: Electron.IpcRendererEvent) => void
  ) => () => void
  getUpdateState: () => Promise<UpdateState>
  manualUpdate: () => Promise<void>
  shutdownStore: {
    getLastShutdownServers: () => Promise<CoreWorkload[]>
    clearShutdownHistory: () => Promise<{ success: boolean }>
  }
  featureFlags: {
    get: (key: string) => Promise<boolean>
    enable: (key: string) => Promise<void>
    disable: (key: string) => Promise<void>
    getAll: () => Promise<
      Record<string, FeatureFlagOptions & { enabled: boolean }>
    >
  }
  // File/folder pickers
  selectFile: () => Promise<string | null>
  selectFolder: () => Promise<string | null>
  // chat
  chat: {
    getProviders: () => Promise<
      Array<{ id: string; name: string; models: string[] }>
    >
    fetchProviderModels: (
      providerId: string,
      tempCredential?: string
    ) => Promise<{ id: string; name: string; models: string[] } | null>
    stream: (
      request:
        | {
            chatId: string
            messages: ChatUIMessage[]
            provider: 'ollama' | 'lmstudio'
            model: string
            endpointURL: string
            enabledTools?: string[]
          }
        | {
            chatId: string
            messages: ChatUIMessage[]
            provider: string
            model: string
            apiKey: string
            enabledTools?: string[]
          }
    ) => Promise<{ streamId: string }>
    getSettings: (providerId: string) => Promise<
      | {
          providerId: 'ollama' | 'lmstudio'
          endpointURL: string
          enabledTools: string[]
        }
      | { providerId: string; apiKey: string; enabledTools: string[] }
    >
    saveSettings: (
      providerId: string,
      settings:
        | { apiKey: string; enabledTools: string[] }
        | { endpointURL: string; enabledTools: string[] }
    ) => Promise<{ success: boolean; error?: string }>
    clearSettings: (
      providerId?: string
    ) => Promise<{ success: boolean; error?: string }>
    discoverModels: () => Promise<{
      providers: Array<{
        id: string
        name: string
        models: Array<{
          id: string
          supportsTools: boolean
          category?: string
          experimental?: boolean
        }>
      }>
      discoveredAt: string
    }>
    getSelectedModel: () => Promise<{ provider: string; model: string }>
    saveSelectedModel: (
      provider: string,
      model: string
    ) => Promise<{ success: boolean; error?: string }>
    getMcpServerTools: (serverId: string) => Promise<AvailableServer>
    getEnabledMcpTools: () => Promise<Record<string, string[]>>
    getEnabledMcpServersFromTools: () => Promise<string[]>
    saveEnabledMcpTools: (
      serverName: string,
      enabledTools: string[]
    ) => Promise<{ success: boolean; error?: string }>
    getToolhiveMcpInfo: () => Promise<AvailableServer>

    // Thread management
    createThread: (
      title?: string,
      initialMessages?: unknown[]
    ) => Promise<{
      success: boolean
      threadId?: string
      error?: string
    }>
    getThread: (threadId: string) => Promise<{
      id: string
      title?: string
      messages: ChatUIMessage[]
      lastEditTimestamp: number
      createdAt: number
    } | null>
    getAllThreads: () => Promise<
      Array<{
        id: string
        title?: string
        messages: ChatUIMessage[]
        lastEditTimestamp: number
        createdAt: number
      }>
    >
    updateThread: (
      threadId: string,
      updates: unknown
    ) => Promise<{
      success: boolean
      error?: string
    }>
    deleteThread: (threadId: string) => Promise<{
      success: boolean
      error?: string
    }>
    clearAllThreads: () => Promise<{
      success: boolean
      error?: string
    }>
    getThreadCount: () => Promise<number>

    // Message management
    addMessageToThread: (
      threadId: string,
      message: unknown
    ) => Promise<{
      success: boolean
      error?: string
    }>
    updateThreadMessages: (
      threadId: string,
      messages: ChatUIMessage[]
    ) => Promise<{
      success: boolean
      error?: string
    }>

    // Active thread management
    getActiveThreadId: () => Promise<string | undefined>
    setActiveThreadId: (threadId?: string) => {
      success: boolean
      error?: string
    }

    // High-level integration
    createChatThread: (
      title?: string,
      initialUserMessage?: string
    ) => Promise<{
      success: boolean
      threadId?: string
      error?: string
    }>
    getThreadMessagesForTransport: (threadId: string) => Promise<
      UIMessage<{
        createdAt?: number
        model?: string
        totalUsage?: LanguageModelV2Usage
        responseTime?: number
        finishReason?: string
      }>[]
    >
    getThreadInfo: (threadId: string) => Promise<{
      thread: {
        id: string
        title?: string
        messages: ChatUIMessage[]
        lastEditTimestamp: number
        createdAt: number
      } | null
      messageCount: number
      lastActivity: Date | null
      hasUserMessages: boolean
      hasAssistantMessages: boolean
    }>
    ensureThreadExists: (
      threadId?: string,
      title?: string
    ) => Promise<{
      success: boolean
      threadId?: string
      error?: string
      isNew?: boolean
    }>
  }
  utils: {
    getWorkloadAvailableTools: (workload: unknown) => Promise<
      | Record<
          string,
          {
            description?: string
            inputSchema?: {
              properties?: Record<string, unknown>
            }
          }
        >
      | undefined
    >
  }

  // MCP Compliance
  mcpCompliance: {
    runChecks: (serverName: string) => Promise<ComplianceReport>
  }

  // CLI Alignment (THV-0020)
  cliAlignment: {
    getStatus: () => Promise<{
      isManaged: boolean
      cliPath: string
      cliVersion: string | null
      installMethod: 'symlink' | 'copy' | null
      symlinkTarget: string | null
      isValid: boolean
      lastValidated: string
    }>
    reinstall: () => Promise<{ success: boolean; error?: string }>
    getPathStatus: () => Promise<{
      isConfigured: boolean
      modifiedFiles: string[]
      pathEntry: string
    }>
    getValidationResult: () => Promise<ValidationResult | null>
    validate: () => Promise<ValidationResult>
    repair: () => Promise<{
      repairResult: { success: boolean; error?: string }
      validationResult: ValidationResult | null
    }>
  }

  // IPC event listeners for streaming
  on: (channel: string, listener: (...args: unknown[]) => void) => void
  removeListener: (
    channel: string,
    listener: (...args: unknown[]) => void
  ) => void
}
