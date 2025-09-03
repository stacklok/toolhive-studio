import {
  getApiV1BetaDiscoveryClientsQueryKey,
  postApiV1BetaClientsMutation,
} from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'

interface RegisterClientParams {
  name: string
  group: string
}

export function useMutationRegisterClient({ name, group }: RegisterClientParams) {
  const queryClient = useQueryClient()
  return useToastMutation({
    ...postApiV1BetaClientsMutation(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
    },
    errorMsg: `Failed to connect ${name}`,
  })
}
