// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'
import type { WorkloadsWorkload } from '../../renderer/src/common/api/generated/types.gen'
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
  isReleaseBuild: () => ipcRenderer.invoke('is-release-build'),

  // ToolHive port
  getToolhivePort: () => ipcRenderer.invoke('get-toolhive-port'),
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
})

export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  isReleaseBuild: () => Promise<boolean>
  isUpdateInProgress: () => Promise<boolean>
  getAutoLaunchStatus: () => Promise<boolean>
  setAutoLaunch: (enabled: boolean) => Promise<boolean>
  showApp: () => Promise<void>
  hideApp: () => Promise<void>
  quitApp: () => Promise<void>
  getToolhivePort: () => Promise<number | undefined>
  getToolhiveVersion: () => Promise<string>
  isToolhiveRunning: () => Promise<boolean>
  checkContainerEngine: () => Promise<{
    docker: boolean
    podman: boolean
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
    getLastShutdownServers: () => Promise<WorkloadsWorkload[]>
    clearShutdownHistory: () => Promise<{ success: boolean }>
  }
}
