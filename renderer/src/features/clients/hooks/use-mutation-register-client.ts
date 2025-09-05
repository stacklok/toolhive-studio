import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'
import {
  postApiV1BetaClientsRegisterMutation,
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaClientsQueryKey,
} from '@api/@tanstack/react-query.gen'

export function useMutationRegisterClient(clientType: string) {
  const queryClient = useQueryClient()

  return useToastMutation({
    ...postApiV1BetaClientsRegisterMutation(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaClientsQueryKey(),
      })
    },
    successMsg: `Client ${clientType} registered`,
    errorMsg: `Failed to register client ${clientType}`,
    loadingMsg: `Registering ${clientType}...`,
  })
}
