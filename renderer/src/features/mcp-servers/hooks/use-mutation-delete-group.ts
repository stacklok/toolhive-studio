import { useQueryClient } from '@tanstack/react-query'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { deleteApiV1BetaGroupsByNameMutation } from '@api/@tanstack/react-query.gen'

export function useMutationDeleteGroup() {
  const queryClient = useQueryClient()

  return useToastMutation({
    ...deleteApiV1BetaGroupsByNameMutation(),
    onSuccess: () => {
      // Refresh groups list
      queryClient.invalidateQueries({ queryKey: ['api', 'v1beta', 'groups'] })
    },
    successMsg: (variables) => `Group "${variables.path.name}" deleted`,
    loadingMsg: 'Deleting group...',
  })
}
