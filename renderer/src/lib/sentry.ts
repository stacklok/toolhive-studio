import * as Sentry from '@sentry/electron/renderer'

export function initSentry() {
  Sentry.init({
    // Adds request headers and IP for users, for more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/electron/configuration/options/#sendDefaultPii
    sendDefaultPii: true,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
    tracesSampleRate: 1.0,
    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/session-replay/configuration/#general-integration-configuration
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // It will send errors, exceptions and captured messages to Sentry only if the user has enabled telemetry
    beforeSend: async (event) =>
      (await window.electronAPI.sentry.isEnabled) ? event : null,
    // It will send transactions to Sentry only if the user has enabled telemetry
    beforeSendTransaction: async (transaction) => {
      if (!(await window.electronAPI.sentry.isEnabled)) {
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
