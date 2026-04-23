import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import {
  deleteApiV1BetaGroupsByNameMutation,
  getApiV1BetaGroupsQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import { useNavigate } from '@tanstack/react-router'
import { trackEvent } from '@/common/lib/analytics'
import { queryClient } from '@/common/lib/query-client'

export function useMutationDeleteGroup() {
  const navigate = useNavigate()

  return useToastMutation({
    ...deleteApiV1BetaGroupsByNameMutation(),
    onSuccess: async (_, variables) => {
      const deletedGroupName = variables?.path?.name
      trackEvent(`Group deleted ${deletedGroupName}`, {
        group_name: deletedGroupName,
        is_default_group: 'false',
      })

      queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
      navigate({ to: '/group/$groupName', params: { groupName: 'default' } })
    },
    successMsg: (variables) => `Group "${variables.path.name}" deleted`,
    loadingMsg: 'Deleting group...',
  })
}
