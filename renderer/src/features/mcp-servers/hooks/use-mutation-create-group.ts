import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postApiV1BetaGroups } from '@api/sdk.gen'
import type { PostApiV1BetaGroupsData } from '@api/types.gen'

export function useMutationCreateGroup() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: PostApiV1BetaGroupsData) => {
      const response = await postApiV1BetaGroups({
        body: data.body,
        parseAs: 'json',
        responseStyle: 'data',
      })
      return response
    },
    onSuccess: () => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: ['api', 'v1beta', 'groups'] })
    },
  })
}