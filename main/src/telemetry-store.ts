import Store from 'electron-store'

const isE2E = process.env.TOOLHIVE_E2E === 'true'

export const telemetryStore = new Store<{ isTelemetryEnabled: boolean }>({
  defaults: { isTelemetryEnabled: !isE2E },
})
