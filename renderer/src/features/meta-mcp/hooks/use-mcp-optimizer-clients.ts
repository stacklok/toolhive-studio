import { useCallback } from 'react'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import {
  getApiV1BetaGroupsQueryKey,
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaGroupsOptions,
  postApiV1BetaClientsRegisterMutation,
  postApiV1BetaClientsUnregisterMutation,
} from '@api/@tanstack/react-query.gen'
import { queryClient } from '@/common/lib/query-client'
import log from 'electron-log/renderer'
import type { GroupsGroup } from '@api/types.gen'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'

const getClientFieldName = (clientType: string): string =>
  `enable${clientType
    .charAt(0)
    .toUpperCase()}${clientType.slice(1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}`

export function useMcpOptimizerClients() {
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
      await queryClient.invalidateQueries({
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
      await queryClient.invalidateQueries({
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
    async ({
      groupName,
      previousGroupName,
      clientsStatus,
    }: {
      groupName: string
      previousGroupName?: string
      clientsStatus?: Record<string, boolean>
    }) => {
      try {
        const isGroupChanged =
          previousGroupName && previousGroupName !== groupName
        if (isGroupChanged) {
          await restoreClientsToGroup(previousGroupName)
          log.info(
            `Restored clients from ${previousGroupName} to ${groupName} group`
          )
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

        const selectedGroupClients = selectedGroup.registered_clients ?? []
        const currentOptimizerClients =
          groupsData?.groups?.find(
            (g: GroupsGroup) => g.name === MCP_OPTIMIZER_GROUP_NAME
          )?.registered_clients ?? []

        const clientsToAdd = selectedGroupClients.filter(
          (client) => !currentOptimizerClients.includes(client)
        )
        const clientsToRemove = currentOptimizerClients.filter((client) =>
          clientsStatus
            ? clientsStatus[getClientFieldName(client)] === false
            : !selectedGroupClients.includes(client) && isGroupChanged
        )
        log.info(
          `Clients to add to optimizer group: ${clientsToAdd.join(', ') || 'none'}`
        )
        log.info(
          `Clients to remove from optimizer group: ${clientsToRemove.join(', ') || 'none'}`
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

        if (selectedGroupClients.length > 0) {
          try {
            await unregisterClients({
              body: {
                names: selectedGroupClients,
                groups: [groupName],
              },
            })
            log.info(
              `Removed all clients from ${groupName}: ${selectedGroupClients.join(', ')}`
            )
          } catch (error) {
            log.error(`Failed to unregister clients from ${groupName}:`, error)
            throw new Error(
              `Failed to unregister servers from ${groupName}: ${selectedGroupClients.join(', ')}`
            )
          }
        }
      } catch (error) {
        log.error(`Error syncing clients for group ${groupName}:`, error)
        throw error
      }
    },
    [registerClients, unregisterClients, restoreClientsToGroup]
  )

  return { saveGroupClients, restoreClientsToGroup }
}
