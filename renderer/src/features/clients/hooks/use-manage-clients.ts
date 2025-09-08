import { useAvailableClients } from './use-available-clients'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { trackEvent } from '@/common/lib/analytics'
import {
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaClientsQueryKey,
  postApiV1BetaClientsMutation,
} from '@api/@tanstack/react-query.gen'
import {
  getApiV1BetaClients,
  deleteApiV1BetaClientsByNameGroupsByGroup,
  getApiV1BetaGroups,
} from '@api/sdk.gen'

/**
 * Hook for managing clients dynamically based on discovery API
 * This uses the discovery clients API to get the list of available clients
 */
export function useManageClients(groupName: string) {
  const { installedClients, getClientDisplayName, getClientFieldName } =
    useAvailableClients()
  const queryClient = useQueryClient()

  // Fetch groups data to compute the current group's registered clients
  const { data: groupsData } = useQuery({
    queryKey: ['api', 'v1beta', 'groups'],
    queryFn: async () => {
      const response = await getApiV1BetaGroups({
        parseAs: 'text',
        responseStyle: 'data',
      })
      const parsed =
        typeof response === 'string' ? JSON.parse(response) : response
      return parsed as {
        groups?: Array<{ name: string; registered_clients?: string[] }>
      }
    },
    staleTime: 5_000,
  })
  const registeredClientsInGroup =
    groupsData?.groups?.find((g) => g.name === groupName)?.registered_clients ||
    []

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
    const parsed =
      typeof currentClients === 'string'
        ? currentClients
          ? JSON.parse(currentClients)
          : null
        : currentClients

    // Normalize to an array shape even if backend returns null or wrapped form
    const list: Array<{ name?: { name?: string }; groups?: string[] }> =
      Array.isArray(parsed)
        ? parsed
        : parsed && Array.isArray((parsed as { clients?: unknown[] }).clients)
          ? (((parsed as { clients?: unknown[] }).clients || []) as Array<{
              name?: { name?: string }
              groups?: string[]
            }>)
          : []

    // Find the current client and get its existing groups
    const currentClient = list.find(
      (clientItem) => clientItem.name?.name === clientType
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

  // Compute default toggle values for the prompt form based on current group membership
  const defaultValues: Record<string, boolean> = installedClients.reduce(
    (acc, client) => {
      const fieldName = getClientFieldName(client.client_type!)
      acc[fieldName] = registeredClientsInGroup.includes(client.client_type!)
      return acc
    },
    {} as Record<string, boolean>
  )

  /**
   * Reconcile the group's clients against the desired toggle state by issuing the minimal API calls.
   */
  const reconcileGroupClients = async (
    desiredValues: Record<string, boolean>
  ) => {
    const originalValues = defaultValues
    const changes = installedClients.reduce(
      (acc, client) => {
        const fieldName = getClientFieldName(client.client_type!)
        acc[client.client_type!] =
          desiredValues[fieldName] !== originalValues[fieldName]
        return acc
      },
      {} as Record<string, boolean>
    )

    for (const client of installedClients) {
      const clientType = client.client_type!
      if (!changes[clientType]) continue
      const fieldName = getClientFieldName(clientType)
      const isEnabled = desiredValues[fieldName]
      if (isEnabled) {
        await addClientToGroup(clientType, groupName)
      } else {
        await removeClientFromGroup(clientType, groupName)
      }
    }
  }

  return {
    installedClients,
    defaultValues,
    reconcileGroupClients,
    addClientToGroup,
    removeClientFromGroup,
    getClientDisplayName,
    getClientFieldName,
  }
}
