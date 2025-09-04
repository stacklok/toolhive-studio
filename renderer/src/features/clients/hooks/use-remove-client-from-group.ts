import { getApiV1BetaDiscoveryClientsQueryKey } from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'
import { trackEvent } from '@/common/lib/analytics'
import { deleteApiV1BetaClientsByNameGroupsByGroup } from '@api/sdk.gen'

interface RemoveClientFromGroupParams {
  clientType: string
}

export function useRemoveClientFromGroup({
  clientType,
}: RemoveClientFromGroupParams) {
  const queryClient = useQueryClient()
  const { mutateAsync: unregisterClient } = useToastMutation({
    mutationFn: async ({ groupName }: { groupName: string }) => {
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
    errorMsg: `Failed to disconnect ${clientType}`,
  })

  const removeClientFromGroup = async ({
    groupName,
  }: {
    groupName: string
  }) => {
    await unregisterClient({ groupName })
    trackEvent(`Client ${clientType} unregistered`, {
      client: clientType,
    })
  }

  return {
    removeClientFromGroup,
  }
}
