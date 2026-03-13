import { ipcRenderer } from 'electron'

export const telemetryApi = {
  sentry: {
    isEnabled: () => ipcRenderer.invoke('sentry.is-enabled'),
    optIn: () => ipcRenderer.invoke('sentry.opt-in'),
    optOut: () => ipcRenderer.invoke('sentry.opt-out'),
  },
}

export interface TelemetryAPI {
  sentry: {
    isEnabled: () => Promise<boolean>
    optIn: () => Promise<boolean>
    optOut: () => Promise<boolean>
  }
}
