import type { FileRouteTypes } from '@/route-tree.gen'
import { Link, useRouterState } from '@tanstack/react-router'
import { forwardRef, type ComponentProps } from 'react'

type Route = FileRouteTypes['fullPaths']

function getViewTransition(
  from: string,
  to: string
): ComponentProps<typeof Link>['viewTransition'] {
  const typedFrom = from as Route
  const typedTo = to as Route

  switch (typedFrom) {
    case '/':
      switch (typedTo) {
        case '/clients':
        case '/registry':
        case '/secrets':
          return { types: ['slide-left'] }
        default:
          return false
      }
    case '/registry':
      switch (typedTo) {
        case '/':
          return { types: ['slide-right'] }
        case '/clients':
        case '/secrets':
          return { types: ['slide-left'] }
        default:
          return false
      }
    case '/clients':
      switch (typedTo) {
        case '/':
        case '/registry':
          return { types: ['slide-right'] }
        case '/secrets':
          return { types: ['slide-left'] }
        default:
          return false
      }
    case '/secrets':
      switch (typedTo) {
        case '/':
        case '/registry':
        case '/clients':
          return { types: ['slide-right'] }
        default:
          return false
      }
    default:
      return false
  }
}

export const LinkViewTransition = forwardRef<
  HTMLAnchorElement,
  Omit<ComponentProps<typeof Link>, 'viewTransition'>
>((props, ref) => {
  const location = useRouterState({ select: (s) => s.location })

  const viewTransition = getViewTransition(
    location.pathname,
    props.to as string
  )

  return <Link {...props} ref={ref} viewTransition={viewTransition} />
})
