import * as Sentry from '@sentry/electron/main'
import { telemetryStore } from './telemetry-store'
import { getInstanceId } from './util'
import { getAutoLaunchStatus } from './auto-launch'

const isE2E = process.env.TOOLHIVE_E2E === 'true'

const store = telemetryStore

// Headers and query params that can identify the user, matching the SDK v10
// default denylist.
const PII_DENYLIST = ['forwarded', '-ip', 'remote-', 'via', '-user']

export function initSentry() {
  Sentry.init({
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
    dsn: isE2E ? undefined : import.meta.env.VITE_SENTRY_DSN,
    propagateTraceparent: true,
    tracePropagationTargets: ['localhost', /^https?:\/\/127\.0\.0\.1/],
    tracesSampleRate: 1.0,
    // SDK v11 streams spans by default, which turns `beforeSendTransaction`
    // into a no-op. We rely on it to honour the telemetry opt-out and to add
    // custom trace data, so keep the transaction-based lifecycle.
    traceLifecycle: 'static',
    // SDK v11 collects much more data when `dataCollection` is unset. The main
    // process talks to the ToolHive API (secrets, MCP tool calls) and runs the
    // chat runtime, so keep the restrictive v10 defaults.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { deny: PII_DENYLIST },
        response: { deny: PII_DENYLIST },
      },
      httpBodies: [],
      urlQueryParams: { deny: PII_DENYLIST },
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
    },
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
