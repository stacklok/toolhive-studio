import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { createTestRouter } from './create-test-router'
import { ConfirmProvider } from '@/common/contexts/confirm-context'

// NOTE: This is used only to infer a type for the router
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _router = createTestRouter(() => <></>)

export function renderRoute(router: typeof _router) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <ConfirmProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConfirmProvider>
  )
}
