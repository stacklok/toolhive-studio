import { useMutationRegisterClient } from './use-mutation-register-client'
import { trackEvent } from '@/common/lib/analytics'

interface AddClientToGroupParams {
  clientType: string
}

export function useAddClientToGroup({ clientType }: AddClientToGroupParams) {
  const { mutateAsync: registerClient } = useMutationRegisterClient({
    name: clientType,
  })

  const addClientToGroup = async ({ groupName }: { groupName: string }) => {
    await registerClient({
      body: {
        name: clientType,
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
