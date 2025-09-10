import {
  Router,
  createMemoryHistory,
  createRootRouteWithContext,
  Outlet,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

type FileRouteLike = {
  update: (cfg: {
    id: string
    path: string
    getParentRoute: () => unknown
  }) => unknown
}

export function createFileRouteTestRouter(
  fileRouteImport: FileRouteLike,
  path: string,
  initialPath: string,
  queryClient: QueryClient
) {
  const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    component: Outlet,
    errorComponent: ({ error }) => <div>{String(error)}</div>,
  })

  const FileRoute = fileRouteImport.update({
    id: path,
    path,
    getParentRoute: () => rootRoute,
  })

  return new Router({
    routeTree: rootRoute.addChildren([FileRoute]),
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
}
