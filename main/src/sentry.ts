import * as Sentry from '@sentry/electron/main'
import { telemetryStore } from './telemetry-store'
import { getInstanceId } from './util'
import { getAutoLaunchStatus } from './auto-launch'

const isE2E = process.env.TOOLHIVE_E2E === 'true'

const store = telemetryStore

export function initSentry() {
  Sentry.init({
    dsn: isE2E ? undefined : import.meta.env.VITE_SENTRY_DSN,
    tracesSampleRate: 1.0,
    beforeSend: (event) =>
      store.get('isTelemetryEnabled', true) ? event : null,
    beforeSendTransaction: async (transaction) => {
      if (!store.get('isTelemetryEnabled', true)) {
        return null
      }
      if (!transaction?.contexts?.trace) return null

      const instanceId = await getInstanceId()
      const trace = transaction.contexts.trace

      return {
        ...transaction,
        contexts: {
          ...transaction.contexts,
          trace: {
            ...trace,
            data: {
              ...transaction.contexts.trace.data,
              'custom.user_id': instanceId,
              auto_launch_status: `${getAutoLaunchStatus()}`,
            },
          },
        },
      }
    },
  })
}
