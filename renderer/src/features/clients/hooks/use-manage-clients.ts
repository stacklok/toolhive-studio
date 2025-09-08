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

export function useManageClients(groupName: string) {
  const { installedClients, getClientDisplayName, getClientFieldName } =
    useAvailableClients()
  const queryClient = useQueryClient()

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

  const addClientToGroup = async (clientType: string, groupName: string) => {
    const client = installedClients.find((c) => c.client_type === clientType)
    if (!client) {
      throw new Error(`Client ${clientType} is not installed or available`)
    }

    const currentClients = await getApiV1BetaClients({
      parseAs: 'text',
      responseStyle: 'data',
    })

    const parsed =
      typeof currentClients === 'string'
        ? currentClients
          ? JSON.parse(currentClients)
          : null
        : currentClients

    const list: Array<{ name?: { name?: string }; groups?: string[] }> =
      Array.isArray(parsed)
        ? parsed
        : parsed && Array.isArray((parsed as { clients?: unknown[] }).clients)
          ? (((parsed as { clients?: unknown[] }).clients || []) as Array<{
              name?: { name?: string }
              groups?: string[]
            }>)
          : []

    const currentClient = list.find(
      (clientItem) => clientItem.name?.name === clientType
    )
    const existingGroups = currentClient?.groups || []

    const newGroups = existingGroups.includes(groupName)
      ? existingGroups
      : [...existingGroups, groupName]

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

  const defaultValues: Record<string, boolean> = installedClients.reduce(
    (acc, client) => {
      const fieldName = getClientFieldName(client.client_type!)
      acc[fieldName] = registeredClientsInGroup.includes(client.client_type!)
      return acc
    },
    {} as Record<string, boolean>
  )

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
