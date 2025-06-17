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

function RootComponent() {
  const matches = useMatches()
  const isShutdownRoute = matches.some((match) => match.routeId === '/shutdown')

  return (
    <div className="flex h-screen min-h-0 flex-col">
      {!isShutdownRoute && <TopNav />}
      <Main>
        <Outlet />
        <TanStackRouterDevtools />
      </Main>
    </div>
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
