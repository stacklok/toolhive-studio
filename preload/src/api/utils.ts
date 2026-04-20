import { ipcRenderer } from 'electron'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'

export const utilsApi = {
  isOfficialReleaseBuild: () => ipcRenderer.invoke('is-official-release-build'),
  getTelemetryHeaders: () => ipcRenderer.invoke('telemetry-headers'),
  getInstanceId: () => ipcRenderer.invoke('get-instance-id'),

  utils: {
    getWorkloadAvailableTools: (workload: CoreWorkload) =>
      ipcRenderer.invoke('utils:get-workload-available-tools', workload),
  },
}

export interface UtilsAPI {
  isOfficialReleaseBuild: () => Promise<boolean>
  getTelemetryHeaders: () => Promise<Record<string, string>>
  getInstanceId: () => Promise<string>
  utils: {
    getWorkloadAvailableTools: (workload: CoreWorkload) => Promise<
      | Record<
          string,
          {
            description?: string
            inputSchema?: {
              properties?: Record<string, unknown>
            }
          }
        >
      | null
      | undefined
    >
  }
}
