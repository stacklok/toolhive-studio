import { useMutation, useQuery } from '@tanstack/react-query'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import {
  deleteApiV1BetaGroupsByNameMutation,
  deleteApiV1BetaWorkloadsByNameMutation,
  getApiV1BetaGroupsQueryKey,
  getApiV1BetaWorkloadsByNameOptions,
  getApiV1BetaWorkloadsQueryKey,
} from '@api/@tanstack/react-query.gen'
import { useNavigate } from '@tanstack/react-router'
import { trackEvent } from '@/common/lib/analytics'
import { useGroups } from './use-groups'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../utils/feature-flags'
import { META_MCP_SERVER_NAME } from '@/common/lib/constants'
import log from 'electron-log/renderer'
import { toast } from 'sonner'
import { queryClient } from '@/common/lib/query-client'

export function useMutationDeleteGroup() {
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)
  const { data: optimizerWorkloadDetail } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: META_MCP_SERVER_NAME },
    }),
    enabled: isMetaOptimizerEnabled,
  })
  const optimizedGroupName = optimizerWorkloadDetail?.env_vars?.ALLOWED_GROUPS
  const navigate = useNavigate()
  const { data: groupsData } = useGroups()

  const deleteWorkload = useMutation({
    ...deleteApiV1BetaWorkloadsByNameMutation(),
    onSuccess: async () => {
      log.info('Optimizer workload deleted on group')
    },
    onError: (error) => {
      toast.error('Failed to delete optimizer workload')
      log.error('Failed to delete optimizer workload', error)
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey(),
      })
    },
  })

  return useToastMutation({
    ...deleteApiV1BetaGroupsByNameMutation(),
    onSuccess: async (_, variables) => {
      const deletedGroupName = variables?.path?.name
      const remainingGroupsCount = (groupsData?.groups?.length ?? 1) - 1
      trackEvent('Group deleted', {
        is_default_group: 'false',
        remaining_groups_count: remainingGroupsCount,
      })
      if (optimizedGroupName === deletedGroupName) {
        await deleteWorkload.mutateAsync({
          path: { name: META_MCP_SERVER_NAME },
        })
      }

      queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
      navigate({ to: '/group/$groupName', params: { groupName: 'default' } })
    },
    successMsg: (variables) => `Group "${variables.path.name}" deleted`,
    loadingMsg: 'Deleting group...',
  })
}
