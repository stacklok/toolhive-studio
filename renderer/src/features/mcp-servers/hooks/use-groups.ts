import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'
import type { V1GroupListResponse } from '@api/types.gen'

export function useGroups() {
  return useQuery({
    queryKey: ['api', 'v1beta', 'groups'],
    queryFn: async () => {
      const response = await getApiV1BetaGroups({
        parseAs: 'text',
        responseStyle: 'data',
      })
      const parsed =
        typeof response === 'string' ? JSON.parse(response) : response
      return parsed as V1GroupListResponse
    },
    staleTime: 5_000,
  })
}
