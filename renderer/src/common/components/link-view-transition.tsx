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
  // Try to match routes by normalizing paths to their patterns
  const normalizeRoute = (path: string): Route | null => {
    for (const route of ORDERED_ROUTES) {
      // Exact match
      if (path === route) return route

      // Pattern match: replace dynamic segments with their pattern
      const pattern = route.replace(/\$\w+/g, '[^/]+')
      const regex = new RegExp(`^${pattern}$`)
      if (regex.test(path)) return route
    }
    return null
  }

  const fromRoute = normalizeRoute(from)
  const toRoute = normalizeRoute(to)

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
  const location = useRouterState({ select: (s) => s.location })

  const viewTransition = getViewTransition(
    location.pathname,
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
