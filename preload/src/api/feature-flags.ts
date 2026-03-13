import { ipcRenderer } from 'electron'
import type { FeatureFlagOptions } from '../../../main/src/feature-flags'

export const featureFlagsApi = {
  featureFlags: {
    get: (key: string) => ipcRenderer.invoke('feature-flags:get', key),
    enable: (key: string) => ipcRenderer.invoke('feature-flags:enable', key),
    disable: (key: string) => ipcRenderer.invoke('feature-flags:disable', key),
    getAll: () => ipcRenderer.invoke('feature-flags:get-all'),
  },
}

export interface FeatureFlagsAPI {
  featureFlags: {
    get: (key: string) => Promise<boolean>
    enable: (key: string) => Promise<void>
    disable: (key: string) => Promise<void>
    getAll: () => Promise<
      Record<string, FeatureFlagOptions & { enabled: boolean }>
    >
  }
}
