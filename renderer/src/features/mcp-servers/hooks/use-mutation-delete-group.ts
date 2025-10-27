import { useMutation, useQuery } from '@tanstack/react-query'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import {
  deleteApiV1BetaGroupsByNameMutation,
  deleteApiV1BetaWorkloadsByNameMutation,
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaGroupsOptions,
  getApiV1BetaGroupsQueryKey,
  getApiV1BetaWorkloadsByNameOptions,
  getApiV1BetaWorkloadsQueryKey,
  postApiV1BetaClientsUnregisterMutation,
} from '@api/@tanstack/react-query.gen'
import { useNavigate } from '@tanstack/react-router'
import { trackEvent } from '@/common/lib/analytics'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../utils/feature-flags'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import log from 'electron-log/renderer'
import { toast } from 'sonner'
import { queryClient } from '@/common/lib/query-client'

export function useMutationDeleteGroup() {
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)
  const { data: optimizerWorkloadDetail } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: META_MCP_SERVER_NAME },
    }),
    retry: false,
    enabled: isMetaOptimizerEnabled,
  })
  const optimizedGroupName = optimizerWorkloadDetail?.env_vars?.ALLOWED_GROUPS
  const navigate = useNavigate()
  const { data: groupsData } = useQuery({
    ...getApiV1BetaGroupsOptions(),
  })
  const groupsNotOptimized = groupsData?.groups?.filter(
    (group) => group.name !== MCP_OPTIMIZER_GROUP_NAME
  )
  const optimizerGroupClients =
    groupsData?.groups?.find((group) => group.name === MCP_OPTIMIZER_GROUP_NAME)
      ?.registered_clients ?? []

  const { mutateAsync: unregisterClients } = useMutation({
    ...postApiV1BetaClientsUnregisterMutation(),
    onError: (error) => {
      log.error('Error unregistering clients from optimizer group', error)
    },
    onSuccess: () => {
      log.info('Successfully unregistered clients from optimizer group')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
    },
  })

  const deleteWorkload = useMutation({
    ...deleteApiV1BetaWorkloadsByNameMutation(),
    onSuccess: async () => {
      trackEvent('MCP Optimizer workload deleted on group', {
        group_name: MCP_OPTIMIZER_GROUP_NAME,
      })
      log.info('Optimizer workload deleted on group')
      if (optimizerGroupClients.length > 0) {
        await unregisterClients({
          body: {
            names: optimizerGroupClients,
            groups: [MCP_OPTIMIZER_GROUP_NAME],
          },
        })
      }
    },
    onError: (error) => {
      toast.error('Failed to delete optimizer workload')
      log.error('Failed to delete optimizer workload', error)
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey(),
      })

      queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })

      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
    },
  })

  return useToastMutation({
    ...deleteApiV1BetaGroupsByNameMutation(),
    onSuccess: async (_, variables) => {
      const deletedGroupName = variables?.path?.name
      const remainingGroupsCount = (groupsNotOptimized?.length ?? 1) - 1
      trackEvent(`Group deleted ${deletedGroupName}`, {
        group_name: deletedGroupName,
        is_default_group: 'false',
        is_optimizer_group: `${optimizedGroupName === deletedGroupName}`,
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
