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
import { ThemeProvider } from './common/components/theme/theme-provider'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import log from 'electron-log/renderer'

import './index.css'
import { PromptProvider } from './common/contexts/prompt/provider'
import { trackPageView } from './common/lib/analytics'
import { queryClient } from './common/lib/query-client'
import { initSentry } from './lib/sentry'
import { configureClient } from './lib/client-config'
// Import feature flags to bind them to window for developer tools access
import './common/lib/feature-flags'
// Import OS design devtools to bind OsDesign.setMac/setWindows/reset to window
import './common/lib/os-design'

initSentry()

if (!window.electronAPI || !window.electronAPI.apiFetch) {
  log.error('ToolHive API bridge not available in renderer')
}

;(async () => {
  await configureClient()

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

  // Listen for deep link navigation events — the main process resolves
  // the deep link URL to a navigation target, so the renderer just navigates.
  const deepLinkCleanup = window.electronAPI.onDeepLinkNavigation((target) => {
    log.info(`[deep-link] Navigating to: ${target.to}`, target.params)
    router.navigate(target)
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
