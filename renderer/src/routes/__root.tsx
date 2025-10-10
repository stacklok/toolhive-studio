import { getHealth, postApiV1BetaSecrets } from '@api/sdk.gen'
import { client } from '@api/client.gen'
import { Main } from '@/common/components/layout/main'
import { TopNav } from '@/common/components/layout/top-nav'
import { Error as ErrorComponent } from '@/common/components/error'
import { NotFound } from '@/common/components/not-found'
import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
  useMatches,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/common/components/ui/sonner'
import { getApiV1BetaSecretsDefaultOptions } from '@api/@tanstack/react-query.gen'
import '@fontsource/space-mono/400.css'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource/atkinson-hyperlegible/400-italic.css'
import '@fontsource/atkinson-hyperlegible/700-italic.css'
import '@fontsource-variable/inter/wght.css'
import log from 'electron-log/renderer'
import * as Sentry from '@sentry/electron/renderer'

async function setupSecretProvider(queryClient: QueryClient) {
  const createEncryptedProvider = async () =>
    postApiV1BetaSecrets({
      body: { provider_type: 'encrypted' },
      throwOnError: true,
    })

  return queryClient
    .ensureQueryData(getApiV1BetaSecretsDefaultOptions())
    .then(async (res) => {
      if (res?.provider_type !== 'encrypted') {
        await createEncryptedProvider()
      }
    })
    .catch((err) => {
      log.info(
        'Error setting up secret provider, creating encrypted provider',
        JSON.stringify(err)
      )
      return createEncryptedProvider()
    })
}

function RootComponent() {
  const matches = useMatches()
  const isShutdownRoute = matches.some((match) => match.routeId === '/shutdown')

  return (
    <>
      {!isShutdownRoute && <TopNav />}
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
    </>
  )
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  errorComponent: ({ error }) => {
    return <ErrorComponent error={error} />
  },
  notFoundComponent: () => <NotFound />,
  onError: (error) => {
    log.error(error)
  },
  beforeLoad: async ({ context: { queryClient } }) => {
    let isUpdateInProgress = false

    try {
      isUpdateInProgress = await window.electronAPI.isUpdateInProgress()
    } catch (e) {
      log.debug(`[beforeLoad] Update check API not available: ${e}`)
    }

    if (isUpdateInProgress) {
      log.info(`[beforeLoad] Skipping health API check - update in progress`)
      return
    }

    await queryClient.ensureQueryData({
      queryKey: ['is-toolhive-running'],
      queryFn: async () => {
        const res = await window.electronAPI.isToolhiveRunning()
        if (!res) {
          log.error('ToolHive is not running')
        }
        return res
      },
      retry: 5,
      retryDelay: 500,
      staleTime: 0,
    })
    try {
      await queryClient.ensureQueryData({
        queryKey: ['health'],
        queryFn: () => getHealth({ throwOnError: true }),
        retry: 2,
        retryDelay: 200,
        staleTime: 0,
        gcTime: 0,
      })
    } catch (error) {
      const [isToolhiveRunning, port, containerEngineStatus] =
        await Promise.all([
          window.electronAPI.isToolhiveRunning(),
          window.electronAPI.getToolhivePort(),
          window.electronAPI.checkContainerEngine(),
        ])

      const clientConfig = client.getConfig()

      log.error(
        `[beforeLoad] Client baseUrl: ${clientConfig.baseUrl || 'NOT SET'}`
      )
      log.error(`[beforeLoad] ToolHive process running: ${isToolhiveRunning}`)

      Sentry.captureException(error, {
        level: 'error',
        tags: {
          component: 'root-route',
          phase: 'beforeLoad',
          toolhive_running: `${isToolhiveRunning}`,
          container_engine_available: `${containerEngineStatus.available}`,
        },
        extra: {
          is_toolhive_running: `${isToolhiveRunning}`,
          toolhive_port: port,
          client_base_url: clientConfig.baseUrl,
          client_configured: `${!!clientConfig.baseUrl}`,
          container_engine: {
            available: `${containerEngineStatus.available}`,
          },
          error_message:
            error instanceof Error ? error.message : JSON.stringify(error),
        },
        fingerprint: [
          'health-check-failed',
          isToolhiveRunning ? 'process-running' : 'process-not-running',
        ],
      })
      throw new Error(`Health check failed: ${error}`)
    }
  },
  loader: async ({ context: { queryClient } }) =>
    await setupSecretProvider(queryClient),
})
