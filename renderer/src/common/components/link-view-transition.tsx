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
  const matchRoute = (path: string): Route | null => {
    for (const route of ORDERED_ROUTES) {
      if (path === route) return route

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

  return (
    <Link
      {...(props as unknown as Parameters<typeof Link>[0])}
      ref={ref}
      viewTransition={viewTransition}
    />
  )
})
