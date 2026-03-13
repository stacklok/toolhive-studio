import { ipcRenderer } from 'electron'

export const utilsApi = {
  isOfficialReleaseBuild: () => ipcRenderer.invoke('is-official-release-build'),
  getTelemetryHeaders: () => ipcRenderer.invoke('telemetry-headers'),
  getInstanceId: () => ipcRenderer.invoke('get-instance-id'),

  utils: {
    getWorkloadAvailableTools: (workload: unknown) =>
      ipcRenderer.invoke('utils:get-workload-available-tools', workload),
  },
}

export interface UtilsAPI {
  isOfficialReleaseBuild: () => Promise<boolean>
  getTelemetryHeaders: () => Promise<Record<string, string>>
  getInstanceId: () => Promise<string>
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
}
