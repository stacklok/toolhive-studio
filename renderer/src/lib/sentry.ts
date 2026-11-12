import * as Sentry from '@sentry/electron/renderer'

export function initSentry() {
  Sentry.init({
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
    // SDK v11 replaced `sendDefaultPii` with `dataCollection`. Its defaults
    // match our previous `sendDefaultPii: true` (request headers and user IP),
    // but also collect request/response bodies and AI/MCP inputs and outputs,
    // which can contain secrets and chat content, so turn those off.
    // https://docs.sentry.io/platforms/javascript/configuration/options/#dataCollection
    dataCollection: {
      httpBodies: [],
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
    },
    // SDK v11 streams spans by default, which turns `beforeSendTransaction`
    // into a no-op. We rely on it to honour the telemetry opt-out and to add
    // custom trace data, so keep the transaction-based lifecycle.
    traceLifecycle: 'static',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    propagateTraceparent: true,
    tracePropagationTargets: ['localhost', /^https?:\/\/127\.0\.0\.1/],
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
    tracesSampleRate: 1.0,
    // Disable random session replays and capture 10% of sessions with an
    // error to keep replay volume low.
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/session-replay/configuration/#general-integration-configuration
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    // It will send errors, exceptions and captured messages to Sentry only if the user has enabled telemetry
    beforeSend: async (event) =>
      (await window.electronAPI.sentry.isEnabled()) ? event : null,
    // It will send transactions to Sentry only if the user has enabled telemetry
    beforeSendTransaction: async (transaction) => {
      if (!(await window.electronAPI.sentry.isEnabled())) {
        return null
      }
      if (!transaction?.contexts?.trace) return null

      const instanceId = await window.electronAPI.getInstanceId()
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
            },
          },
        },
      }
    },
  })
}
