import {
  deleteApiV1BetaClientsByNameMutation,
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaClientsQueryKey,
  getApiV1BetaGroupsQueryKey,
} from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'

export function useMutationUnregisterClient(clientName: string) {
  const queryClient = useQueryClient()
  return useToastMutation({
    ...deleteApiV1BetaClientsByNameMutation(),
    onSettled: () => {
      // Invalidate all related queries to ensure UI reflects updated state
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaClientsQueryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
    },
    errorMsg: `Failed to disconnect ${clientName}`,
  })
}
