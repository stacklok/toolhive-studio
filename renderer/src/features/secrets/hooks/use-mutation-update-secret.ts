import { getApiV1BetaSecretsDefaultKeysQueryKey, putApiV1BetaSecretsDefaultKeysByKeyMutation } from "@/common/api/generated/@tanstack/react-query.gen";
import { useToastMutation } from "@/common/hooks/use-toast-mutation";
import { useQueryClient } from "@tanstack/react-query";

export function useMutationUpdateSecret(secretKey: string) {
  const queryClient = useQueryClient()
  return useToastMutation({
    ...putApiV1BetaSecretsDefaultKeysByKeyMutation(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaSecretsDefaultKeysQueryKey(),
      })
    },
    errorMsg: `Failed to update secret ${secretKey}`,
  })
}