import {
  Router,
  createMemoryHistory,
  createRootRouteWithContext,
  Outlet,
} from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

export function createFileRouteTestRouter(
  fileRouteImport: unknown,
  path: string,
  initialPath: string,
  queryClient: QueryClient
) {
  const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    component: Outlet,
    errorComponent: ({ error }) => <div>{String(error)}</div>,
  })

  const routeObj = fileRouteImport as { update: (cfg: unknown) => unknown }
  const FileRoute = routeObj.update({
    id: path,
    path,
    getParentRoute: () => rootRoute,
  }) as unknown

  return new Router({
    routeTree: rootRoute.addChildren([FileRoute as unknown as AnyRoute]),
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
}
