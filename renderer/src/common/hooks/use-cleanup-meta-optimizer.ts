import { useFeatureFlag } from './use-feature-flag'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'
import { featureFlagKeys } from '../../../../utils/feature-flags'
import {
  deleteApiV1BetaGroupsByNameMutation,
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaGroupsOptions,
  getApiV1BetaGroupsQueryKey,
} from '@api/@tanstack/react-query.gen'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteApiV1BetaClientsByNameGroupsByGroup } from '@api/index'
import { useCallback } from 'react'
import { useToastMutation } from './use-toast-mutation'
import log from 'electron-log/renderer'

function useDeleteGroup() {
  const queryClient = useQueryClient()
  const { mutateAsync: deleteGroup } = useToastMutation({
    ...deleteApiV1BetaGroupsByNameMutation(),
    onError: (error, variables) => {
      log.error(`Failed to delete group "${variables.path.name}"`, error)
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
    },
    errorMsg: 'Failed to delete group',
  })

  return deleteGroup
}

function useUnregisterClients() {
  const queryClient = useQueryClient()
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
  const isExperimentalFeaturesEnabled = useFeatureFlag(
    featureFlagKeys.EXPERIMENTAL_FEATURES
  )
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)
  const deleteGroup = useDeleteGroup()
  const unregisterClients = useUnregisterClients()
  const { data: groupsList } = useQuery({
    ...getApiV1BetaGroupsOptions(),
    staleTime: 0,
    gcTime: 0,
  })

  const removeClientsFromGroup = async (clients: string[]) => {
    for (const clientType of clients) {
      await unregisterClients({
        clientType,
      })
    }
  }

  const mcpOptimizerGroup = groupsList?.groups?.find(
    (g) => g.name === MCP_OPTIMIZER_GROUP_NAME
  )

  const cleanupMetaOptimizer = useCallback(async () => {
    if (!isExperimentalFeaturesEnabled || !isMetaOptimizerEnabled) return
    if (!mcpOptimizerGroup) return

    if (mcpOptimizerGroup && !!mcpOptimizerGroup.registered_clients?.length) {
      await removeClientsFromGroup(mcpOptimizerGroup.registered_clients!)
    }

    await deleteGroup({
      path: { name: MCP_OPTIMIZER_GROUP_NAME },
      query: { 'with-workloads': true },
    })
  }, [
    isExperimentalFeaturesEnabled,
    isMetaOptimizerEnabled,
    mcpOptimizerGroup,
    deleteGroup,
    unregisterClients,
  ])

  return { cleanupMetaOptimizer }
}
