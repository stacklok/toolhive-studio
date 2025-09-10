import { useQueryClient } from '@tanstack/react-query'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { deleteApiV1BetaGroupsByNameMutation } from '@api/@tanstack/react-query.gen'
import { useNavigate } from '@tanstack/react-router'

export function useMutationDeleteGroup() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useToastMutation({
    ...deleteApiV1BetaGroupsByNameMutation(),
    onSuccess: () => {
      // Refresh groups list
      queryClient.invalidateQueries({ queryKey: ['api', 'v1beta', 'groups'] })
      // Navigate to default group
      navigate({ to: '/group/$groupName', params: { groupName: 'default' } })
    },
    successMsg: (variables) => `Group "${variables.path.name}" deleted`,
    loadingMsg: 'Deleting group...',
  })
}
