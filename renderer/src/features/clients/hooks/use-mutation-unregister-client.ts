import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'
import {
  postApiV1BetaClientsUnregisterMutation,
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaClientsQueryKey,
} from '@api/@tanstack/react-query.gen'

export function useMutationUnregisterClient(clientType: string) {
  const queryClient = useQueryClient()

  return useToastMutation({
    ...postApiV1BetaClientsUnregisterMutation(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaClientsQueryKey(),
      })
    },
    successMsg: `Client ${clientType} unregistered`,
    errorMsg: `Failed to unregister client ${clientType}`,
    loadingMsg: `Unregistering ${clientType}...`,
  })
}
