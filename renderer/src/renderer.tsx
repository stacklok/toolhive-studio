import { client } from './common/api/generated/client.gen'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { routeTree } from './route-tree.gen'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import * as Sentry from '@sentry/electron/renderer'
import { Toaster } from './common/components/ui/sonner'
import { ThemeProvider } from './common/components/theme/theme-provider'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import './index.css'
import { ConfirmProvider } from './common/contexts/confirm/provider'

// Funzione per inviare traces al Collector OpenTelemetry
const sendToOtelCollector = async (
  transactionName: string,
  transactionData?: Record<string, unknown>
) => {
  try {
    console.log(
      '🔍 Sending trace to Collector:',
      transactionName,
      transactionData
    )
    const traceId = Math.random()
      .toString(16)
      .substring(2, 18)
      .padStart(32, '0')
    const spanId = Math.random().toString(16).substring(2, 10).padStart(16, '0')

    const payload = {
      resourceSpans: [
        {
          resource: {
            attributes: [
              {
                key: 'service.name',
                value: { stringValue: 'toolhive-electron' },
              },
              { key: 'service.version', value: { stringValue: '1.0.0' } },
            ],
          },
          scopeSpans: [
            {
              spans: [
                {
                  traceId,
                  spanId,
                  name: transactionName,
                  kind: 1, // SPAN_KIND_INTERNAL
                  startTimeUnixNano: Date.now() * 1000000,
                  endTimeUnixNano: Date.now() * 1000000,
                  attributes: Object.entries(transactionData || {}).map(
                    ([key, value]) => ({
                      key,
                      value: { stringValue: JSON.stringify(value) },
                    })
                  ),
                },
              ],
            },
          ],
        },
      ],
    }

    await fetch('http://localhost:4320/v1/traces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log('📤 Trace inviato a Jaeger via Collector:', transactionName)
  } catch (error) {
    console.warn('⚠️ Errore invio trace a Collector:', error)
  }
}

// Sentry setup
Sentry.init({
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/electron/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration({
      instrumentNavigation: true,
      instrumentPageLoad: true,
    }),
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

  // Hook per inviare traces anche a Jaeger
  beforeSendTransaction: (transaction) => {
    console.log('🔍 Sentry Transaction:', transaction)

    // Invia anche al Collector OpenTelemetry
    const transactionName = transaction.transaction || 'unknown-transaction'
    sendToOtelCollector(transactionName, transaction.contexts?.trace)

    // Continua l'invio a Sentry
    return transaction
  },
})

// @tanstack/react-router setup
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const memoryHistory = createMemoryHistory({
  initialEntries: ['/'],
})

const queryClient = new QueryClient({})
const router = createRouter({
  routeTree,
  context: { queryClient },
  history: memoryHistory,
})

if (!window.electronAPI || !window.electronAPI.getToolhivePort) {
  console.error('ToolHive port API not available in renderer')
}

// Listener completo per tutte le change del router
router.subscribe('onLoad', (data) => {
  console.log('📍 Route loaded:', data)
  Sentry.startSpan(
    {
      name: `route ${data.toLocation.pathname}`,
      op: 'route.load',
      attributes: {
        'route.from': data.fromLocation?.pathname ?? '/',
        'route.pathname': data.toLocation.pathname,
        'route.search': JSON.stringify(data.toLocation.search),
        'route.hash': data.toLocation.hash,
      },
    },
    () => {
      console.log('📍 Route loaded:', data.toLocation.pathname)
    }
  )
})
;(async () => {
  try {
    const port = await window.electronAPI.getToolhivePort()
    const baseUrl = `http://localhost:${port}`
    client.setConfig({ baseUrl })
  } catch (e) {
    console.error('Failed to get ToolHive port from main process', e)
    throw e
  }

  // Listen for server shutdown event
  const cleanup = window.electronAPI.onServerShutdown(() => {
    router.navigate({ to: '/shutdown' })
  })

  const rootElement = document.getElementById('root')!
  const root = ReactDOM.createRoot(rootElement)

  root.render(
    <StrictMode>
      <ThemeProvider defaultTheme="system" storageKey="toolhive-ui-theme">
        <ConfirmProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider delayDuration={0}>
              <Toaster position="top-right" />
              <RouterProvider router={router} />
            </TooltipProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </ConfirmProvider>
      </ThemeProvider>
    </StrictMode>
  )

  // Cleanup listener on unmount
  return () => {
    cleanup()
  }
})()
