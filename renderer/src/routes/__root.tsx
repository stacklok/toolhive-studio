import { getHealth } from '@/common/api/generated'
import { Main } from '@/common/components/layout/main'
import { TopNav } from '@/common/components/layout/top-nav'
import { Error } from '@/common/components/error'
import { NotFound } from '@/common/components/not-found'
import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
  useMatches,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/common/components/ui/sonner'

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
          position="top-right"
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
  errorComponent: ({ error }) => <Error error={error} />,
  notFoundComponent: () => <NotFound />,
  onError: (error) => {
    console.error(error)
  },
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData({
      queryKey: ['health'],
      queryFn: () => getHealth({}),
    })
  },
})
