import type { FileRouteTypes } from '@/route-tree.gen'
import { Link, useRouterState } from '@tanstack/react-router'
import { forwardRef, type ComponentProps } from 'react'

type Route = FileRouteTypes['fullPaths']

const ORDERED_ROUTES: Route[] = [
  '/group/$groupName',
  '/registry',
  '/clients',
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
  Omit<ComponentProps<typeof Link>, 'viewTransition'>
>((props, ref) => {
  const location = useRouterState({ select: (s) => s.location })

  const viewTransition = getViewTransition(
    location.pathname,
    props.to as string
  )

  return <Link {...props} ref={ref} viewTransition={viewTransition} />
})
