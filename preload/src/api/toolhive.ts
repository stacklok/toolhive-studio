import { ipcRenderer } from 'electron'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
import { TOOLHIVE_VERSION } from '../../../utils/constants'
import type { ToolhiveStatus } from '../../../common/types/toolhive-status'

export const toolhiveApi = {
  getToolhivePort: () => ipcRenderer.invoke('get-toolhive-port'),
  getToolhiveMcpPort: () => ipcRenderer.invoke('get-toolhive-mcp-port'),
  getToolhiveSocketPath: () => ipcRenderer.invoke('get-toolhive-socket-path'),
  getToolhiveVersion: () => TOOLHIVE_VERSION,
  isToolhiveRunning: () => ipcRenderer.invoke('is-toolhive-running'),
  getToolhiveStatus: () => ipcRenderer.invoke('get-toolhive-status'),
  isUsingCustomPort: () => ipcRenderer.invoke('is-using-custom-port'),
  checkContainerEngine: () => ipcRenderer.invoke('check-container-engine'),
  restartToolhive: () => ipcRenderer.invoke('restart-toolhive'),

  apiFetch: (req: {
    requestId: string
    method: string
    path: string
    headers: Record<string, string>
    body?: string
  }) => ipcRenderer.invoke('api-fetch', req),
  apiFetchAbort: (requestId: string) =>
    ipcRenderer.invoke('api-fetch-abort', requestId),

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
  getToolhiveSocketPath: () => Promise<string | undefined>
  getToolhiveVersion: () => string
  isToolhiveRunning: () => Promise<boolean>
  getToolhiveStatus: () => Promise<ToolhiveStatus>
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
  apiFetch: (req: {
    requestId: string
    method: string
    path: string
    headers: Record<string, string>
    body?: string
  }) => Promise<{
    status: number
    headers: Record<string, string>
    body: string
  }>
  apiFetchAbort: (requestId: string) => Promise<void>
  shutdownStore: {
    getLastShutdownServers: () => Promise<CoreWorkload[]>
    clearShutdownHistory: () => Promise<{ success: boolean }>
  }
}
