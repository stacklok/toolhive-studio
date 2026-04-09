import { ipcRenderer } from 'electron'
import type { NavigateTarget } from '@common/deep-links'

export const eventsApi = {
  onServerShutdown: (callback: () => void) => {
    ipcRenderer.on('graceful-exit', callback)
    return () => {
      ipcRenderer.removeListener('graceful-exit', callback)
    }
  },

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

  on: (channel: string, listener: (...args: unknown[]) => void) => {
    const wrapped = (_: Electron.IpcRendererEvent, ...args: unknown[]) =>
      listener(...args)
    ipcRenderer.on(channel, wrapped)
    return () => {
      ipcRenderer.removeListener(channel, wrapped)
    }
  },
  removeListener: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, listener)
  },
}

export interface EventsAPI {
  onServerShutdown: (callback: () => void) => () => void
  onDeepLinkNavigation: (
    callback: (target: NavigateTarget) => void
  ) => () => void
  on: (channel: string, listener: (...args: unknown[]) => void) => () => void
  removeListener: (
    channel: string,
    listener: (...args: unknown[]) => void
  ) => void
}
