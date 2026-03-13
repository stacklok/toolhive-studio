import { ipcRenderer } from 'electron'
import type { UpdateState } from '../../../main/src/auto-update'

export const autoUpdateApi = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isUpdateInProgress: () => ipcRenderer.invoke('is-update-in-progress'),
  installUpdateAndRestart: () =>
    ipcRenderer.invoke('install-update-and-restart'),
  isAutoUpdateEnabled: () => ipcRenderer.invoke('auto-update:get'),
  setAutoUpdate: (enabled: boolean) =>
    ipcRenderer.invoke('auto-update:set', enabled),
  getUpdateState: () => ipcRenderer.invoke('get-update-state'),
  manualUpdate: () => ipcRenderer.invoke('manual-update'),

  onUpdateDownloaded: (
    callback: (_event: Electron.IpcRendererEvent) => void
  ) => {
    ipcRenderer.on('update-downloaded', callback)
    return () => {
      ipcRenderer.removeListener('update-downloaded', callback)
    }
  },
}

export interface AutoUpdateAPI {
  getAppVersion: () => Promise<{
    currentVersion: string
    latestVersion: string
    isNewVersionAvailable: boolean
  }>
  isUpdateInProgress: () => Promise<boolean>
  installUpdateAndRestart: () => Promise<{ success: boolean }>
  isAutoUpdateEnabled: () => Promise<boolean>
  setAutoUpdate: (enabled: boolean) => Promise<boolean>
  getUpdateState: () => Promise<UpdateState>
  manualUpdate: () => Promise<void>
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
}
