import {
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaClientsQueryKey,
  postApiV1BetaClientsMutation,
} from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'
import { trackEvent } from '@/common/lib/analytics'
import { getApiV1BetaClients } from '@api/sdk.gen'

interface AddClientToGroupParams {
  clientType: string
}

export function useAddClientToGroup({ clientType }: AddClientToGroupParams) {
  const queryClient = useQueryClient()
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
    errorMsg: `Failed to connect ${clientType}`,
  })

  const addClientToGroup = async ({ groupName }: { groupName: string }) => {
    try {
      // First, get the current client data to see what groups it's already in
      const currentClients = await getApiV1BetaClients({
        parseAs: 'text',
        responseStyle: 'data',
      })
      
      // Parse the response
      const parsedClients = typeof currentClients === 'string' 
        ? JSON.parse(currentClients) 
        : currentClients
      
      // Find the current client and get its existing groups
      const currentClient = parsedClients.find((client: any) => client.name?.name === clientType)
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
    } catch (error) {
      // If we can't get current groups, fall back to just adding the new group
      // This maintains backward compatibility
      await registerClient({
        body: {
          name: clientType,
          groups: [groupName],
        },
      })
      
      trackEvent(`Client ${clientType} registered`, {
        client: clientType,
        groups: [groupName],
      })
    }
  }

  return {
    addClientToGroup,
  }
}
