import {
  deleteApiV1BetaClientsByNameMutation,
  getApiV1BetaDiscoveryClientsQueryKey,
} from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'

interface UnregisterClientParams {
  name: string
}

export function useMutationUnregisterClient({ name }: UnregisterClientParams) {
  const queryClient = useQueryClient()
  return useToastMutation({
    ...deleteApiV1BetaClientsByNameMutation(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
    },
    errorMsg: `Failed to disconnect ${name}`,
  })
}
