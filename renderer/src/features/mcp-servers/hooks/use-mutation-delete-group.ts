import { useQueryClient } from '@tanstack/react-query'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { deleteApiV1BetaGroupsByNameMutation } from '@api/@tanstack/react-query.gen'
import { useNavigate } from '@tanstack/react-router'
import { trackEvent } from '@/common/lib/analytics'
import { useGroups } from './use-groups'

export function useMutationDeleteGroup() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: groupsData } = useGroups()

  return useToastMutation({
    ...deleteApiV1BetaGroupsByNameMutation(),
    onSuccess: () => {
      const remainingGroupsCount = (groupsData?.groups?.length ?? 1) - 1
      trackEvent('Group deleted', {
        isDefaultGroup: false,
        remainingGroupsCount,
      })
      queryClient.invalidateQueries({ queryKey: ['api', 'v1beta', 'groups'] })
      navigate({ to: '/group/$groupName', params: { groupName: 'default' } })
    },
    successMsg: (variables) => `Group "${variables.path.name}" deleted`,
    loadingMsg: 'Deleting group...',
  })
}
