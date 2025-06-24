import {
  getApiV1BetaSecretsDefaultKeysQueryKey,
  postApiV1BetaSecretsDefaultKeysMutation,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'

export function useMutationCerateSecret() {
  const queryClient = useQueryClient()
  return useToastMutation({
    ...postApiV1BetaSecretsDefaultKeysMutation(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaSecretsDefaultKeysQueryKey(),
      })
    },
    errorMsg: 'Failed to create secret',
  })
}
