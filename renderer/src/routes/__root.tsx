import { getHealth } from '@/common/api/generated'
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
import {
  postApiV1BetaSecretsOptions,
  getApiV1BetaSecretsDefaultOptions,
} from '@/common/api/generated/@tanstack/react-query.gen'
import '@fontsource/space-mono/400.css'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource/atkinson-hyperlegible/400-italic.css'
import '@fontsource/atkinson-hyperlegible/700-italic.css'
import '@fontsource-variable/inter/wght.css'
import log from 'electron-log/renderer'

async function setupSecretProvider(queryClient: QueryClient) {
  const createEncryptedProvider = () =>
    queryClient.ensureQueryData(
      postApiV1BetaSecretsOptions({
        body: { provider_type: 'encrypted' },
      })
    )

  return queryClient
    .ensureQueryData(getApiV1BetaSecretsDefaultOptions())
    .then(async (res) => {
      if (res?.provider_type !== 'encrypted') {
        await createEncryptedProvider()
      }
    })
    .catch(createEncryptedProvider)
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
    await queryClient.ensureQueryData({
      queryKey: ['is-toolhive-running'],
      queryFn: async () => {
        const res = await window.electronAPI.isToolhiveRunning()
        const appVersion = await window.electronAPI.getAppVersion()
        if (!res) {
          log.error('Error ToolHive is not running')
        }
        log.info(`ToolHive version ${appVersion} is running`)
        return res
      },
      retry: 3,
      retryDelay: 300,
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
      throw new Error(`${error}`)
    }
  },
  loader: async ({ context: { queryClient } }) =>
    await setupSecretProvider(queryClient),
})
