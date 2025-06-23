import {
  deleteApiV1BetaClientsByNameMutation,
  getApiV1BetaDiscoveryClientsQueryKey,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'

export function useMutationUnregisterClient(clientName: string) {
  const queryClient = useQueryClient()
  return useToastMutation({
    ...deleteApiV1BetaClientsByNameMutation(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
    },
    errorMsg: `Failed to disconnect ${clientName}`,
  })
}
