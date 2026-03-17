import { ipcRenderer } from 'electron'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
import { TOOLHIVE_VERSION } from '../../../utils/constants'

export const toolhiveApi = {
  getToolhivePort: () => ipcRenderer.invoke('get-toolhive-port'),
  getToolhiveMcpPort: () => ipcRenderer.invoke('get-toolhive-mcp-port'),
  getToolhiveVersion: () => TOOLHIVE_VERSION,
  isToolhiveRunning: () => ipcRenderer.invoke('is-toolhive-running'),
  isUsingCustomPort: () => ipcRenderer.invoke('is-using-custom-port'),
  checkContainerEngine: () => ipcRenderer.invoke('check-container-engine'),
  restartToolhive: () => ipcRenderer.invoke('restart-toolhive'),

  shutdownStore: {
    getLastShutdownServers: () =>
      ipcRenderer.invoke('shutdown-store:get-last-servers'),
    clearShutdownHistory: () =>
      ipcRenderer.invoke('shutdown-store:clear-history'),
  },
}

export interface ToolhiveAPI {
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
  shutdownStore: {
    getLastShutdownServers: () => Promise<CoreWorkload[]>
    clearShutdownHistory: () => Promise<{ success: boolean }>
  }
}
