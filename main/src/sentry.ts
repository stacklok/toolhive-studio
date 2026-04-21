import * as Sentry from '@sentry/electron/main'
import { getInstanceId } from './util'
import { getAutoLaunchStatus } from './auto-launch'
import { getIsTelemetryEnabled } from './telemetry-settings'

const isE2E = process.env.TOOLHIVE_E2E === 'true'

export function initSentry() {
  Sentry.init({
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
    dsn: isE2E ? undefined : import.meta.env.VITE_SENTRY_DSN,
    propagateTraceparent: true,
    tracePropagationTargets: ['localhost', /^https?:\/\/127\.0\.0\.1/],
    tracesSampleRate: 1.0,
    beforeSend: (event) => (getIsTelemetryEnabled() ? event : null),
    beforeSendTransaction: async (transaction) => {
      if (!getIsTelemetryEnabled()) {
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
