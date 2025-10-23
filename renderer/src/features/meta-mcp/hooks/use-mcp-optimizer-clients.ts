import { useCallback } from 'react'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import {
  getApiV1BetaGroupsQueryKey,
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaGroupsOptions,
  postApiV1BetaClientsRegisterMutation,
  postApiV1BetaClientsUnregisterMutation,
  getApiV1BetaWorkloadsByNameOptions,
} from '@api/@tanstack/react-query.gen'
import { queryClient } from '@/common/lib/query-client'
import log from 'electron-log/renderer'
import type { GroupsGroup } from '@api/types.gen'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import { useQuery } from '@tanstack/react-query'
import { featureFlagKeys } from '../../../../../utils/feature-flags'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'

export function useMcpOptimizerClients() {
  const isExperimentalFeaturesEnabled = useFeatureFlag(
    featureFlagKeys.EXPERIMENTAL_FEATURES
  )
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)
  const { data: optimizerWorkloadDetail } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: META_MCP_SERVER_NAME },
    }),
    refetchOnMount: true,
    staleTime: 5_000,
    enabled: isExperimentalFeaturesEnabled && isMetaOptimizerEnabled,
  })
  const { mutateAsync: registerClients } = useToastMutation({
    ...postApiV1BetaClientsRegisterMutation(),
    onError: (error) => {
      log.error('Error registering clients', error)
    },
    onSuccess: (_, variables) => {
      log.info(
        `Synced clients ${variables.body.names?.join(', ')} on ${MCP_OPTIMIZER_GROUP_NAME} group`
      )
    },
    onSettled: async () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
      await queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
    },
  })

  const { mutateAsync: unregisterClients } = useToastMutation({
    ...postApiV1BetaClientsUnregisterMutation(),
    onError: (error) => {
      log.error('Error unregistering clients', error)
    },
    onSuccess: (_, variables) => {
      log.info(
        `Unsynced clients ${variables.body.names?.join(', ')} from ${MCP_OPTIMIZER_GROUP_NAME} group`
      )
    },
    onSettled: async () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
      await queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
    },
  })

  const restoreClientsToGroup = useCallback(
    async (targetGroupName: string) => {
      try {
        const groupsData = await queryClient.fetchQuery(
          getApiV1BetaGroupsOptions()
        )

        const optimizerGroup = groupsData?.groups?.find(
          (g: GroupsGroup) => g.name === MCP_OPTIMIZER_GROUP_NAME
        )

        if (!optimizerGroup || !optimizerGroup.registered_clients?.length) {
          log.info('No clients to restore from MCP Optimizer group')
          return
        }

        const clientsToRestore = optimizerGroup.registered_clients

        await registerClients({
          body: {
            names: clientsToRestore,
            groups: [targetGroupName],
          },
        })

        log.info(
          `Restored clients ${clientsToRestore.join(', ')} to ${targetGroupName} group`
        )
      } catch (error) {
        log.error(`Error restoring clients to group ${targetGroupName}:`, error)
      }
    },
    [registerClients]
  )

  const saveGroupClients = useCallback(
    async (groupName: string) => {
      try {
        const currentAllowedGroup =
          optimizerWorkloadDetail?.env_vars?.ALLOWED_GROUPS

        if (currentAllowedGroup && currentAllowedGroup !== groupName) {
          await restoreClientsToGroup(currentAllowedGroup)
        }

        const groupsData = await queryClient.fetchQuery(
          getApiV1BetaGroupsOptions()
        )

        const selectedGroup = groupsData?.groups?.find(
          (g: GroupsGroup) => g.name === groupName
        )

        if (!selectedGroup) {
          log.warn(`Group ${groupName} not found`)
          return
        }

        const targetClients = selectedGroup.registered_clients ?? []
        const currentClients =
          groupsData?.groups?.find(
            (g: GroupsGroup) => g.name === MCP_OPTIMIZER_GROUP_NAME
          )?.registered_clients ?? []

        const clientsToAdd = targetClients.filter(
          (client) => !currentClients.includes(client)
        )
        const clientsToRemove = currentClients.filter(
          (client) => !targetClients.includes(client)
        )

        if (clientsToAdd.length > 0) {
          try {
            await registerClients({
              body: {
                names: clientsToAdd,
                groups: [MCP_OPTIMIZER_GROUP_NAME],
              },
            })
          } catch (error) {
            log.error(`Failed to register clients to optimizer group:`, error)
            throw new Error(
              `Failed to add servers to optimizer group: ${clientsToAdd.join(', ')}`
            )
          }
        }

        if (clientsToRemove.length > 0) {
          try {
            await unregisterClients({
              body: {
                names: clientsToRemove,
                groups: [MCP_OPTIMIZER_GROUP_NAME],
              },
            })
          } catch (error) {
            log.error(
              `Failed to unregister clients from optimizer group:`,
              error
            )
            throw new Error(
              `Failed to remove servers from optimizer group: ${clientsToRemove.join(', ')}`
            )
          }
        }

        if (targetClients.length > 0) {
          try {
            await unregisterClients({
              body: {
                names: targetClients,
                groups: [groupName],
              },
            })
            log.info(
              `Removed all clients from ${groupName}: ${targetClients.join(', ')}`
            )
          } catch (error) {
            log.error(`Failed to unregister clients from ${groupName}:`, error)
            throw new Error(
              `Failed to unregister servers from ${groupName}: ${targetClients.join(', ')}`
            )
          }
        }
      } catch (error) {
        log.error(`Error syncing clients for group ${groupName}:`, error)
        throw error
      }
    },
    [
      registerClients,
      unregisterClients,
      restoreClientsToGroup,
      optimizerWorkloadDetail,
    ]
  )

  return { saveGroupClients, restoreClientsToGroup }
}
