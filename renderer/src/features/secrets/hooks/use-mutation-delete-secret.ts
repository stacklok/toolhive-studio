import {
  deleteApiV1BetaSecretsDefaultKeysByKeyMutation,
  getApiV1BetaSecretsDefaultKeysQueryKey,
} from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'

export function useMutationDeleteSecret(secretKey: string) {
  const queryClient = useQueryClient()
  return useToastMutation({
    ...deleteApiV1BetaSecretsDefaultKeysByKeyMutation(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaSecretsDefaultKeysQueryKey(),
      })
    },
    errorMsg: `Failed to delete secret ${secretKey}`,
  })
}
