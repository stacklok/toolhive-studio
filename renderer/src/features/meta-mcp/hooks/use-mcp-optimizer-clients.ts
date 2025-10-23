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
import { toast } from 'sonner'
import type { GroupsGroup } from '@api/types.gen'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'

export function useMcpOptimizerClients() {
  const { mutateAsync: registerClients } = useToastMutation({
    ...postApiV1BetaClientsRegisterMutation(),
    onError: (error) => {
      toast.error('Error registering clients to MCP Optimizer group')
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
      toast.error('Error unregistering clients from MCP Optimizer group')
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

  const saveGroupClients = useCallback(
    async (groupName: string) => {
      try {
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

        if (!clientsToAdd.length && !clientsToRemove.length) {
          log.info(`No changes needed for ${MCP_OPTIMIZER_GROUP_NAME}`)
          return
        }

        if (clientsToAdd.length > 0) {
          await registerClients({
            body: {
              names: clientsToAdd,
              groups: [MCP_OPTIMIZER_GROUP_NAME],
            },
          })
        }

        if (clientsToRemove.length > 0) {
          await unregisterClients({
            body: {
              names: clientsToRemove,
              groups: [MCP_OPTIMIZER_GROUP_NAME],
            },
          })
        }
      } catch (error) {
        log.error(`Error syncing clients for group ${groupName}:`, error)
      }
    },
    [registerClients, unregisterClients]
  )

  return { saveGroupClients }
}
