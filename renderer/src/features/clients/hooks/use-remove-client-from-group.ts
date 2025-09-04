import {
  deleteApiV1BetaClientsByNameMutation,
  getApiV1BetaDiscoveryClientsQueryKey,
} from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'
import { trackEvent } from '@/common/lib/analytics'

interface RemoveClientFromGroupParams {
  clientType: string
}

export function useRemoveClientFromGroup({ clientType }: RemoveClientFromGroupParams) {
  const queryClient = useQueryClient()
  const { mutateAsync: unregisterClient } = useToastMutation({
    ...deleteApiV1BetaClientsByNameMutation(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
    },
    errorMsg: `Failed to disconnect ${clientType}`,
  })

  const removeClientFromGroup = async ({ groupName: _groupName }: { groupName: string }) => {
    await unregisterClient({
      path: {
        name: clientType,
      },
    })
    trackEvent(`Client ${clientType} unregistered`, {
      client: clientType,
    })
  }

  return {
    removeClientFromGroup,
  }
}
