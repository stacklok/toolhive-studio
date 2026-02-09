import { client } from '@common/api/generated/client.gen'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import {
  RouterProvider,
  createRouter,
  createHashHistory,
} from '@tanstack/react-router'
import { routeTree } from './route-tree.gen'
import { QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import * as Sentry from '@sentry/electron/renderer'
import { ThemeProvider } from './common/components/theme/theme-provider'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import log from 'electron-log/renderer'

import './index.css'
import { PromptProvider } from './common/contexts/prompt/provider'
import { trackPageView } from './common/lib/analytics'
import { queryClient } from './common/lib/query-client'
// Import feature flags to bind them to window for developer tools access
import './common/lib/feature-flags'
import { intentsByAction } from '../../main/src/deep-links/intents'

// Sentry setup
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

if (!window.electronAPI || !window.electronAPI.getToolhivePort) {
  log.error('ToolHive port API not available in renderer')
}

;(async () => {
  try {
    const port = await window.electronAPI.getToolhivePort()
    const telemetryHeaders = await window.electronAPI.getTelemetryHeaders()
    const baseUrl = `http://localhost:${port}`

    client.setConfig({
      baseUrl,
      headers: telemetryHeaders,
    })
  } catch (e) {
    log.error('Failed to get ToolHive port from main process: ', e)
    throw e
  }

  const hashHistory = createHashHistory()
  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultViewTransition: true,
    history: hashHistory,
  })

  router.subscribe('onLoad', (data) => {
    trackPageView(data.toLocation.pathname, {
      'route.from': data.fromLocation?.pathname ?? '/',
      'route.pathname': data.toLocation.pathname,
      'route.search': JSON.stringify(data.toLocation.search),
      'route.hash': data.toLocation.hash,
    })
  })

  // Listen for server shutdown event
  const cleanup = window.electronAPI.onServerShutdown(() => {
    router.navigate({ to: '/shutdown' })
  })

  // Listen for deep link navigation events
  const deepLinkCleanup = window.electronAPI.onDeepLinkNavigation((intent) => {
    log.info('[deep-link] Renderer received deep link intent:', intent)

    const intentDef = intentsByAction.get(intent.action)
    if (intentDef) {
      // Params are already Zod-validated in the main process before IPC dispatch
      const target = intentDef.navigate(intent.params as never)
      log.info(`[deep-link] Navigating to: ${target.to}`, target.params)
      router.navigate(target)
    } else {
      log.warn(`[deep-link] Unknown action received: ${intent.action}`)
      router.navigate({ to: '/deep-link-not-found' })
    }
  })

  const rootElement = document.getElementById('root')!
  const root = ReactDOM.createRoot(rootElement)

  root.render(
    <StrictMode>
      <ThemeProvider defaultTheme="system" storageKey="toolhive-ui-theme">
        <PromptProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider delayDuration={0}>
              <RouterProvider router={router} />
            </TooltipProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </PromptProvider>
      </ThemeProvider>
    </StrictMode>
  )

  // Cleanup listeners on unmount
  return () => {
    cleanup()
    deepLinkCleanup()
  }
})()
