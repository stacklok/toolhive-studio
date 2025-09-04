import { useMutationUnregisterClient } from './use-mutation-unregister-client'
import { trackEvent } from '@/common/lib/analytics'

interface RemoveClientFromGroupParams {
  clientType: string
}

export function useRemoveClientFromGroup({ clientType }: RemoveClientFromGroupParams) {
  const { mutateAsync: unregisterClient } = useMutationUnregisterClient({
    name: clientType,
  })

  const removeClientFromGroup = async ({ groupName }: { groupName: string }) => {
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
