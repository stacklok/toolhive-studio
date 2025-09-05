import { useAvailableClients } from './use-available-clients'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'
import { trackEvent } from '@/common/lib/analytics'
import {
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaClientsQueryKey,
  postApiV1BetaClientsMutation,
} from '@api/@tanstack/react-query.gen'
import {
  getApiV1BetaClients,
  deleteApiV1BetaClientsByNameGroupsByGroup,
} from '@api/sdk.gen'

/**
 * Hook for managing clients dynamically based on discovery API
 * This uses the discovery clients API to get the list of available clients
 */
export function useManageClients() {
  const { installedClients, getClientDisplayName, getClientFieldName } =
    useAvailableClients()
  const queryClient = useQueryClient()

  // Create mutation for adding clients
  const { mutateAsync: registerClient } = useToastMutation({
    ...postApiV1BetaClientsMutation(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: ['api', 'v1beta', 'groups'],
      })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaClientsQueryKey(),
      })
    },
  })

  // Create mutation for removing clients
  const { mutateAsync: unregisterClient } = useToastMutation({
    mutationFn: async ({
      clientType,
      groupName,
    }: {
      clientType: string
      groupName: string
    }) => {
      return await deleteApiV1BetaClientsByNameGroupsByGroup({
        path: {
          name: clientType,
          group: groupName,
        },
        parseAs: 'text',
        responseStyle: 'data',
        throwOnError: true,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: ['api', 'v1beta', 'groups'],
      })
    },
  })

  /**
   * Add a client to a group
   */
  const addClientToGroup = async (clientType: string, groupName: string) => {
    // Find the client in the installed clients list
    const client = installedClients.find((c) => c.client_type === clientType)
    if (!client) {
      throw new Error(`Client ${clientType} is not installed or available`)
    }

    // First, get the current client data to see what groups it's already in
    const currentClients = await getApiV1BetaClients({
      parseAs: 'text',
      responseStyle: 'data',
    })

    // Parse the response
    const parsedClients =
      typeof currentClients === 'string'
        ? JSON.parse(currentClients)
        : currentClients

    // Find the current client and get its existing groups
    const currentClient = parsedClients.find(
      (clientItem: { name?: { name?: string }; groups?: string[] }) =>
        clientItem.name?.name === clientType
    )
    const existingGroups = currentClient?.groups || []

    // Create the new groups array by adding the new group (avoiding duplicates)
    const newGroups = existingGroups.includes(groupName)
      ? existingGroups
      : [...existingGroups, groupName]

    // Register/update the client with all groups
    await registerClient({
      body: {
        name: clientType,
        groups: newGroups,
      },
    })

    trackEvent(`Client ${clientType} registered`, {
      client: clientType,
      groups: newGroups,
    })
  }

  /**
   * Remove a client from a group
   */
  const removeClientFromGroup = async (
    clientType: string,
    groupName: string
  ) => {
    // Find the client in the installed clients list
    const client = installedClients.find((c) => c.client_type === clientType)
    if (!client) {
      throw new Error(`Client ${clientType} is not installed or available`)
    }

    await unregisterClient({ clientType, groupName })
    trackEvent(`Client ${clientType} unregistered`, {
      client: clientType,
    })
  }

  return {
    installedClients,
    addClientToGroup,
    removeClientFromGroup,
    getClientDisplayName,
    getClientFieldName,
  }
}
