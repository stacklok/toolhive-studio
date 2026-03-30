import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { REGISTRY_AUTH_TOAST_ID } from '@/common/components/settings/registry/registry-errors-message'
import { REGISTRY_PENDING_TOAST_KEY } from '../guards/handle-registry-auth-redirect'

/**
 * Picks up a pending registry error message (saved by the beforeLoad guard)
 * and shows it as a persistent toast once the Toaster component is mounted.
 */
export function useRegistryErrorToast() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const message = queryClient.getQueryData<string>(REGISTRY_PENDING_TOAST_KEY)
    if (!message) return

    queryClient.removeQueries({ queryKey: REGISTRY_PENDING_TOAST_KEY })
    toast.error(message, {
      id: REGISTRY_AUTH_TOAST_ID,
      duration: Infinity,
      dismissible: true,
    })
  }, [queryClient])
}
