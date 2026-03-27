import { Main } from '@/common/components/layout/main'
import { TopNav } from '@/common/components/layout/top-nav'
import { NotFound } from '@/common/components/not-found'
import { RootErrorComponent } from './root/root-error'
import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
  useMatches,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/common/components/ui/sonner'
import { useRestartShutdownServers } from '@/common/hooks/use-restart-shutdown-servers'
import '@fontsource/space-mono/400.css'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource/atkinson-hyperlegible/400-italic.css'
import '@fontsource/atkinson-hyperlegible/700-italic.css'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/merriweather/wght.css'
import log from 'electron-log/renderer'
import { CustomPortBanner } from '@/common/components/custom-port-banner'
import { NewsletterModal } from '@/common/components/newsletter-modal'
import { ExpertConsultationBanner } from '@/common/components/expert-consultation-banner'
import { checkUpdateInProgress } from './root/guards/check-update-in-progress'
import { validateCliAlignment } from './root/guards/validate-cli-alignment'
import { ensureToolhiveRunning } from './root/guards/ensure-toolhive-running'
import { handleRegistryAuthRedirect } from './root/guards/handle-registry-auth-redirect'
import { checkHealth } from './root/guards/check-health'
import { setupSecretProvider } from './root/guards/setup-secret-provider'

function RootComponent() {
  const matches = useMatches()
  const isShutdownRoute = matches.some((match) => match.routeId === '/shutdown')
  const isCliIssueRoute = matches.some(
    (match) => match.routeId === '/cli-issue'
  )
  const hideNav = isShutdownRoute || isCliIssueRoute

  useRestartShutdownServers()

  return (
    <>
      {!hideNav && <TopNav />}
      {!hideNav && import.meta.env.DEV && <CustomPortBanner />}
      <Main>
        <Outlet />
        <Toaster
          duration={2_000}
          position="bottom-right"
          offset={{ top: 50 }}
          closeButton
        />
        <TanStackRouterDevtools />
      </Main>
      {!hideNav && <NewsletterModal />}
      <ExpertConsultationBanner />
    </>
  )
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  errorComponent: RootErrorComponent,
  notFoundComponent: () => <NotFound />,
  onError: (error) => {
    log.error(error)
  },
  beforeLoad: async ({ context: { queryClient }, location }) => {
    if (await checkUpdateInProgress()) return
    await validateCliAlignment(location.pathname)
    await ensureToolhiveRunning(queryClient)
    const toolhiveStatus = await handleRegistryAuthRedirect(
      queryClient,
      location.pathname
    )
    await checkHealth(queryClient, toolhiveStatus)
  },
  loader: async ({ context: { queryClient } }) => {
    const isRunning = await window.electronAPI.isToolhiveRunning()
    if (!isRunning) return
    await setupSecretProvider(queryClient)
  },
})
