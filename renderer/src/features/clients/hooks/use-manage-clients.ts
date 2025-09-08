import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { trackEvent } from '@/common/lib/analytics'
import {
  getApiV1BetaDiscoveryClientsOptions,
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
  const {
    data: { clients = [] },
  } = useSuspenseQuery(getApiV1BetaDiscoveryClientsOptions())

  const installedClients = clients.filter(
    (client) => client.installed && client.client_type
  )

  const getClientFieldName = (clientType: string): string =>
    `enable${clientType
      .charAt(0)
      .toUpperCase()}${clientType.slice(1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}`
  const queryClient = useQueryClient()

  const { data: groupsData } = useQuery({
    queryKey: ['api', 'v1beta', 'groups'],
    queryFn: async () => {
      const { data: response } = await getApiV1BetaGroups()

      return response
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

    const { data: availableClients = [] } = await getApiV1BetaClients()

    const currentClient = [...(availableClients ?? [])].find(
      (clientItem) => clientItem.name === clientType
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
    getClientFieldName,
  }
}
