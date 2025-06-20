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
import { ThemeProvider } from './common/components/theme/theme-provider'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import './index.css'
import { ConfirmProvider } from './common/contexts/confirm/provider'

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
