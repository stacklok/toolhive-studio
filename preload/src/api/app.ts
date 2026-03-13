import { ipcRenderer } from 'electron'

export const appApi = {
  getAutoLaunchStatus: () => ipcRenderer.invoke('get-auto-launch-status'),
  setAutoLaunch: (enabled: boolean) =>
    ipcRenderer.invoke('set-auto-launch', enabled),

  showApp: () => ipcRenderer.invoke('show-app'),
  hideApp: () => ipcRenderer.invoke('hide-app'),
  quitApp: () => ipcRenderer.invoke('quit-app'),

  getSkipQuitConfirmation: (): Promise<boolean> =>
    ipcRenderer.invoke('get-skip-quit-confirmation'),
  setSkipQuitConfirmation: (skip: boolean): Promise<void> =>
    ipcRenderer.invoke('set-skip-quit-confirmation', skip),

  getMainLogContent: () => ipcRenderer.invoke('get-main-log-content'),

  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  platform: process.platform,
}

export interface AppAPI {
  getAutoLaunchStatus: () => Promise<boolean>
  setAutoLaunch: (enabled: boolean) => Promise<boolean>
  showApp: () => Promise<void>
  hideApp: () => Promise<void>
  quitApp: () => Promise<void>
  getSkipQuitConfirmation: () => Promise<boolean>
  setSkipQuitConfirmation: (skip: boolean) => Promise<void>
  getMainLogContent: () => Promise<string>
  isMac: boolean
  isWindows: boolean
  isLinux: boolean
  platform: NodeJS.Platform
}
