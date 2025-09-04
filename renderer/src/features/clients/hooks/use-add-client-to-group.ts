import {
  getApiV1BetaDiscoveryClientsQueryKey,
  postApiV1BetaClientsMutation,
} from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'
import { trackEvent } from '@/common/lib/analytics'

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
    },
    errorMsg: `Failed to connect ${clientType}`,
  })

  const addClientToGroup = async ({ groupName }: { groupName: string }) => {
    await registerClient({
      body: {
        name: clientType,
        groups: [groupName],
      },
    })
    trackEvent(`Client ${clientType} registered`, {
      client: clientType,
    })
  }

  return {
    addClientToGroup,
  }
}
