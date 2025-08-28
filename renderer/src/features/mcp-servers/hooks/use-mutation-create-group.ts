import { useQueryClient } from '@tanstack/react-query'
import { postApiV1BetaGroups } from '@api/sdk.gen'
import type { PostApiV1BetaGroupsData } from '@api/types.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'

export function useMutationCreateGroup() {
  const queryClient = useQueryClient()

  return useToastMutation({
    mutationFn: async (data: Pick<PostApiV1BetaGroupsData, 'body'>) => {
      return await postApiV1BetaGroups({
        body: data.body,
        parseAs: 'json',
        responseStyle: 'data',
        throwOnError: true,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api', 'v1beta', 'groups'] })
    },
    successMsg: (variables) =>
      `Group "${variables.body.name}" created successfully`,
    loadingMsg: 'Creating group...',
  })
}
