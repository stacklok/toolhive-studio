import { ipcRenderer } from 'electron'

export const darkModeApi = {
  darkMode: {
    toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
    system: () => ipcRenderer.invoke('dark-mode:system'),
    set: (theme: 'light' | 'dark' | 'system') =>
      ipcRenderer.invoke('dark-mode:set', theme),
    get: () => ipcRenderer.invoke('dark-mode:get'),
  },
}

export interface DarkModeAPI {
  darkMode: {
    toggle: () => Promise<boolean>
    system: () => Promise<boolean>
    set: (theme: 'light' | 'dark' | 'system') => Promise<boolean>
    get: () => Promise<{
      shouldUseDarkColors: boolean
      themeSource: 'system' | 'light' | 'dark'
    }>
  }
}
