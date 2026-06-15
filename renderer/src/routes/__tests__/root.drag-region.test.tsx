import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  RouterProvider,
  Router,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/common/hooks/use-restart-shutdown-servers', () => ({
  useRestartShutdownServers: () => undefined,
}))

vi.mock('@/common/hooks/use-mcp-optimizer-startup-cleanup', () => ({
  useMcpOptimizerStartupCleanup: () => undefined,
}))

vi.mock('../root/hooks/use-registry-error-toast', () => ({
  useRegistryErrorToast: () => undefined,
}))

vi.mock('@/common/components/expert-consultation-banner', () => ({
  ExpertConsultationBanner: () => null,
}))

vi.mock('@/common/components/newsletter-modal', () => ({
  NewsletterModal: () => null,
}))

vi.mock('@/common/components/custom-socket-banner', () => ({
  CustomSocketBanner: () => null,
}))

vi.mock('@/common/components/layout/top-nav/window-controls', () => ({
  WindowControls: () => null,
}))

vi.mock('@/common/lib/os-design', () => ({
  getOsDesignVariant: () => 'mac',
}))

import { Route as RootRoute } from '../__root'

function renderRouterAt(path: string) {
  const rootRoute = createRootRoute({
    component: RootRoute.options.component,
  })

  const shutdownRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/shutdown',
    component: () => <div data-testid="shutdown-content">Shutting down</div>,
  })

  const cliIssueRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cli-issue',
    component: () => <div data-testid="cli-issue-content">CLI issue</div>,
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div data-testid="index-content">Home</div>,
  })

  const router = new Router({
    routeTree: rootRoute.addChildren([
      shutdownRoute,
      cliIssueRoute,
      indexRoute,
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultNotFoundComponent: () => null,
  })

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe('Bug: window cannot be moved on chrome-less routes (macOS)', () => {
  it('renders a draggable region (app-region-drag) on /shutdown so the window can be moved', async () => {
    const { container } = renderRouterAt('/shutdown')

    await waitFor(() => {
      const dragElements = container.querySelectorAll('.app-region-drag')
      expect(dragElements.length).toBeGreaterThan(0)
    })
  })

  it('renders a draggable region (app-region-drag) on /cli-issue so the window can be moved', async () => {
    const { container } = renderRouterAt('/cli-issue')

    await waitFor(() => {
      const dragElements = container.querySelectorAll('.app-region-drag')
      expect(dragElements.length).toBeGreaterThan(0)
    })
  })
})
