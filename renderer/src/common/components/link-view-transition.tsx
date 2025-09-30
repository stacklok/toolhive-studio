import type { FileRouteTypes } from '@/route-tree.gen'
import { Link, useRouterState } from '@tanstack/react-router'
import { forwardRef } from 'react'

type Route = FileRouteTypes['fullPaths']
const ORDERED_ROUTES: Route[] = [
  '/group/default' as Route,
  '/group/$groupName',
  '/logs/$groupName/$serverName',
  '/registry',
  '/playground',
  '/secrets',
]

type TransitionType = 'slide-left' | 'slide-right'

type ViewTransitionOptions = {
  types: TransitionType[]
}

function getViewTransition(
  from: string,
  to: string
): ViewTransitionOptions | boolean {
  // Match route by checking if path starts with route prefix (for dynamic segments)
  const matchRoute = (path: string): Route | null => {
    for (const route of ORDERED_ROUTES) {
      if (path === route) return route

      // For patterns like /group/$groupName, match /group/* paths
      // For patterns like /logs/$groupName/$serverName, match /logs/*/* paths
      const parts = route.split('/')
      const pathParts = path.split('/')

      if (parts.length !== pathParts.length) continue

      const matches = parts.every(
        (part, i) => part.startsWith('$') || part === pathParts[i]
      )

      if (matches) return route
    }
    return null
  }

  const fromRoute = matchRoute(from)
  const toRoute = matchRoute(to)

  if (!fromRoute || !toRoute || fromRoute === toRoute) {
    return false
  }

  const fromIndex = ORDERED_ROUTES.indexOf(fromRoute)
  const toIndex = ORDERED_ROUTES.indexOf(toRoute)

  if (toIndex > fromIndex) {
    return { types: ['slide-left'] }
  }

  return { types: ['slide-right'] }
}

export const LinkViewTransition = forwardRef<
  HTMLAnchorElement,
  Record<string, unknown> & { to: string }
>((props, ref) => {
  const routeId = useRouterState({ select: (s) => s.location.pathname })

  const viewTransition = getViewTransition(
    routeId,
    typeof props.to === 'string' ? props.to : String(props.to)
  )

  // Cast is necessary because Link's generic types don't properly infer through forwardRef
  type LinkProps = Parameters<typeof Link>[0]
  return (
    <Link
      {...(props as unknown as LinkProps)}
      ref={ref}
      viewTransition={viewTransition}
    />
  )
})
