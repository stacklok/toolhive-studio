import { useQueryClient } from '@tanstack/react-query'
import { postApiV1BetaGroups } from '@api/sdk.gen'
import type { PostApiV1BetaGroupsData } from '@api/types.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { doesAlreadyExist } from '@/common/lib/error-utils'

export function useMutationCreateGroup() {
  const queryClient = useQueryClient()

  return useToastMutation({
    mutationFn: async (data: Pick<PostApiV1BetaGroupsData, 'body'>) => {
      try {
        const response = await postApiV1BetaGroups({
          body: data.body,
          parseAs: 'json',
          responseStyle: 'data',
          throwOnError: true,
        })
        return response
      } catch (error: unknown) {
        if (doesAlreadyExist(error)) {
          const conflictError = new Error(
            `Group "${data.body.name}" already exists`
          ) as Error & { detail: string }
          conflictError.detail = `A group named "${data.body.name}" already exists. Please choose a different name.`
          throw conflictError
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api', 'v1beta', 'groups'] })
    },
    successMsg: (variables) =>
      `Group "${variables.body.name}" created successfully`,
    loadingMsg: 'Creating group...',
  })
}
