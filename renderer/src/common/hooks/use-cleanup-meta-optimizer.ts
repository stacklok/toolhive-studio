import { queryClient } from '../lib/query-client'
import { useFeatureFlag } from './use-feature-flag'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import { featureFlagKeys } from '../../../../utils/feature-flags'
import {
  deleteApiV1BetaGroupsByNameMutation,
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaGroupsOptions,
  getApiV1BetaGroupsQueryKey,
  getApiV1BetaWorkloadsByNameOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import { useQuery } from '@tanstack/react-query'
import { deleteApiV1BetaClientsByNameGroupsByGroup } from '@common/api/generated/index'
import { useCallback } from 'react'
import { useToastMutation } from './use-toast-mutation'
import { useMcpOptimizerClients } from '@/features/meta-mcp/hooks/use-mcp-optimizer-clients'
import log from 'electron-log/renderer'
import { trackEvent } from '../lib/analytics'

function useDeleteGroup() {
  const { mutateAsync: deleteGroup } = useToastMutation({
    ...deleteApiV1BetaGroupsByNameMutation(),
    onError: (error, variables) => {
      log.error(`Failed to delete group "${variables.path.name}"`, error)
    },
    onSuccess: (_, variables) => {
      trackEvent(`Group deleted ${MCP_OPTIMIZER_GROUP_NAME}`, {
        group_name: variables.path.name,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
    },
    errorMsg: 'Failed to delete MCP Optimizer group',
    successMsg: 'MCP Optimizer is disabled',
    loadingMsg: 'Disabling MCP Optimizer and cleaning up...',
  })

  return deleteGroup
}

function useUnregisterClients() {
  const { mutateAsync: unregisterClients } = useToastMutation({
    mutationFn: async ({ clientType }: { clientType: string }) => {
      return await deleteApiV1BetaClientsByNameGroupsByGroup({
        path: {
          name: clientType,
          group: MCP_OPTIMIZER_GROUP_NAME,
        },
        throwOnError: true,
      })
    },
    onError: (error, variables) => {
      log.error(
        `Failed to unregister client "${variables.clientType}" from group "${MCP_OPTIMIZER_GROUP_NAME}"`,
        error
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
    },
    errorMsg: 'Failed to unregister client from group',
  })

  return unregisterClients
}

export function useCleanupMetaOptimizer() {
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)
  const deleteGroup = useDeleteGroup()
  const unregisterClients = useUnregisterClients()
  const { restoreClientsToGroup } = useMcpOptimizerClients()
  const { data: groupsList } = useQuery({
    ...getApiV1BetaGroupsOptions(),
    staleTime: 0,
    gcTime: 0,
  })
  const { data: optimizerWorkloadDetail } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: META_MCP_SERVER_NAME },
    }),
    refetchOnMount: true,
    staleTime: 5_000,
    retry: false,
    enabled: isMetaOptimizerEnabled,
  })

  const removeClientsFromGroup = useCallback(
    async (clients: string[]) => {
      for (const clientType of clients) {
        await unregisterClients({
          clientType,
        })
      }
    },
    [unregisterClients]
  )

  const mcpOptimizerGroup = groupsList?.groups?.find(
    (g) => g.name === MCP_OPTIMIZER_GROUP_NAME
  )

  const cleanupMetaOptimizer = useCallback(async () => {
    if (!isMetaOptimizerEnabled) return
    if (!mcpOptimizerGroup) return

    const allowedGroup = optimizerWorkloadDetail?.env_vars?.ALLOWED_GROUPS

    if (mcpOptimizerGroup && !!mcpOptimizerGroup.registered_clients?.length) {
      if (allowedGroup) {
        await restoreClientsToGroup(allowedGroup)
      }

      await removeClientsFromGroup(mcpOptimizerGroup.registered_clients!)
    }

    await deleteGroup({
      path: { name: MCP_OPTIMIZER_GROUP_NAME },
      query: { 'with-workloads': true },
    })
  }, [
    isMetaOptimizerEnabled,
    mcpOptimizerGroup,
    optimizerWorkloadDetail,
    deleteGroup,
    restoreClientsToGroup,
    removeClientsFromGroup,
  ])

  return { cleanupMetaOptimizer }
}
