import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { createTestRouter } from './create-test-router'
import { PromptProvider } from '../contexts/prompt/provider'
import { NewsletterModalProvider } from '../contexts/newsletter-modal-provider'
import { PermissionsProvider } from '../contexts/permissions/permissions-provider'
import type { Permissions } from '../contexts/permissions'

// NOTE: This is used only to infer a type for the router
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _router = createTestRouter(() => <></>)

interface RenderRouteOptions {
  permissions?: Partial<Permissions>
}

export function renderRoute(
  router: typeof _router,
  options?: RenderRouteOptions
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <NewsletterModalProvider>
      <PermissionsProvider value={options?.permissions}>
        <PromptProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </PromptProvider>
      </PermissionsProvider>
    </NewsletterModalProvider>
  )
}
