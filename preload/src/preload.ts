// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'
import type { CoreWorkload } from '../../api/generated/types.gen'
import { TOOLHIVE_VERSION } from '../../utils/constants'

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

  // ToolHive port
  getToolhivePort: () => ipcRenderer.invoke('get-toolhive-port'),
  getToolhiveMcpPort: () => ipcRenderer.invoke('get-toolhive-mcp-port'),
  getToolhiveVersion: () => TOOLHIVE_VERSION,
  // ToolHive is running
  isToolhiveRunning: () => ipcRenderer.invoke('is-toolhive-running'),

  // Container engine check
  checkContainerEngine: () => ipcRenderer.invoke('check-container-engine'),

  // ToolHive restart
  restartToolhive: () => ipcRenderer.invoke('restart-toolhive'),

  // Update installation
  installUpdateAndRestart: () =>
    ipcRenderer.invoke('install-update-and-restart'),

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

  // File/folder pickers
  selectFile: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-file'),
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-folder'),

  // Quit confirmation
  onShowQuitConfirmation: (callback: () => void) => {
    ipcRenderer.on('show-quit-confirmation', callback)
    return () => {
      ipcRenderer.removeListener('show-quit-confirmation', callback)
    }
  },

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
    stream: (request: {
      messages: Array<{
        id: string
        role: string
        parts: Array<{ type: string; text: string }>
      }>
      provider: string
      model: string
      apiKey: string
      enabledTools?: string[]
    }) =>
      ipcRenderer.invoke('chat:stream', request) as Promise<{
        streamId: string
      }>,
    getSettings: (providerId: string) =>
      ipcRenderer.invoke('chat:get-settings', providerId),
    saveSettings: (
      providerId: string,
      settings: { apiKey: string; enabledTools: string[] }
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
  getAppVersion: () => Promise<string>
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
  getToolhiveVersion: () => Promise<string>
  isToolhiveRunning: () => Promise<boolean>
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
  getMainLogContent: () => Promise<string>
  isMac: boolean
  isWindows: boolean
  isLinux: boolean
  platform: NodeJS.Platform
  onServerShutdown: (callback: () => void) => () => void
  onShowQuitConfirmation: (callback: () => void) => () => void
  windowControls: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
  }
  onUpdateDownloaded: (
    callback: (_event: Electron.IpcRendererEvent) => void
  ) => void
  shutdownStore: {
    getLastShutdownServers: () => Promise<CoreWorkload[]>
    clearShutdownHistory: () => Promise<{ success: boolean }>
  }
  featureFlags: {
    get: (key: string) => Promise<boolean>
    enable: (key: string) => Promise<void>
    disable: (key: string) => Promise<void>
    getAll: () => Promise<Record<string, boolean>>
  }
  // File/folder pickers
  selectFile: () => Promise<string | null>
  selectFolder: () => Promise<string | null>
  // chat
  chat: {
    getProviders: () => Promise<
      Array<{ id: string; name: string; models: string[] }>
    >
    stream: (request: {
      messages: Array<{
        id: string
        role: string
        parts: Array<{ type: string; text: string }>
      }>
      provider: string
      model: string
      apiKey: string
      enabledTools?: string[]
    }) => Promise<{ streamId: string }>
    getSettings: (
      providerId: string
    ) => Promise<{ apiKey: string; enabledTools: string[] }>
    saveSettings: (
      providerId: string,
      settings: { apiKey: string; enabledTools: string[] }
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
    getMcpServerTools: (serverName: string) => Promise<{
      serverName: string
      serverPackage?: string
      tools: Array<{
        name: string
        description?: string
        parameters?: Record<string, unknown>
        enabled: boolean
      }>
      isRunning: boolean
    } | null>
    getEnabledMcpTools: () => Promise<Record<string, string[]>>
    getEnabledMcpServersFromTools: () => Promise<string[]>
    saveEnabledMcpTools: (
      serverName: string,
      enabledTools: string[]
    ) => Promise<{ success: boolean; error?: string }>
    getToolhiveMcpInfo: () => Promise<{
      available: boolean
      toolCount: number
      tools: Array<{ name: string; description: string }>
    } | null>
  }

  // IPC event listeners for streaming
  on: (channel: string, listener: (...args: unknown[]) => void) => void
  removeListener: (
    channel: string,
    listener: (...args: unknown[]) => void
  ) => void
}
