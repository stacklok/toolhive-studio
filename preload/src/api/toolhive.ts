import { ipcRenderer } from 'electron'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
import type { ToolhiveStatus } from '../../../common/types/toolhive-status'

export const toolhiveApi = {
  getToolhiveSocketPath: () => ipcRenderer.invoke('get-toolhive-socket-path'),
  isToolhiveRunning: () => ipcRenderer.invoke('is-toolhive-running'),
  getToolhiveStatus: () => ipcRenderer.invoke('get-toolhive-status'),
  isUsingCustomSocket: () => ipcRenderer.invoke('is-using-custom-socket'),
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
  getToolhiveSocketPath: () => Promise<string | undefined>
  isToolhiveRunning: () => Promise<boolean>
  getToolhiveStatus: () => Promise<ToolhiveStatus>
  isUsingCustomSocket: () => Promise<boolean>
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
