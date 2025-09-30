import type { FileRouteTypes } from '@/route-tree.gen'
import { Link, useRouterState } from '@tanstack/react-router'
import { forwardRef } from 'react'

type Route = FileRouteTypes['fullPaths']
const ORDERED_ROUTES: Route[] = [
  '/group/default' as Route,
  '/group/$groupName',
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
  const fromIndex = ORDERED_ROUTES.indexOf(from as Route)
  const toIndex = ORDERED_ROUTES.indexOf(to as Route)

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return false
  }

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
