import {
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaClientsQueryKey,
  getApiV1BetaGroupsQueryKey,
  postApiV1BetaClientsMutation,
} from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'

export function useMutationRegisterClient(clientName: string) {
  const queryClient = useQueryClient()
  return useToastMutation({
    ...postApiV1BetaClientsMutation(),
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
    errorMsg: `Failed to connect ${clientName}`,
  })
}
