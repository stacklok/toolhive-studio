import { useQueryClient } from '@tanstack/react-query'
import { deleteApiV1BetaGroupsByName } from '@api/sdk.gen'
import type { DeleteApiV1BetaGroupsByNameData } from '@api/types.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'

export function useMutationDeleteGroup() {
  const queryClient = useQueryClient()

  return useToastMutation({
    mutationFn: async (
      data: Pick<DeleteApiV1BetaGroupsByNameData, 'path' | 'query'>
    ) => {
      return await deleteApiV1BetaGroupsByName({
        path: data.path,
        query: data.query,
        parseAs: 'text',
        responseStyle: 'data',
        throwOnError: true,
      })
    },
    onSuccess: () => {
      // Refresh groups list
      queryClient.invalidateQueries({ queryKey: ['api', 'v1beta', 'groups'] })
    },
    successMsg: (variables) => `Group "${variables.path.name}" deleted`,
    loadingMsg: 'Deleting group...',
  })
}
