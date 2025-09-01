import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'

export interface Group {
  name?: string
  registered_clients?: string[]
}

export interface GroupsResponse {
  groups?: Group[]
}

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
      return parsed as GroupsResponse
    },
    staleTime: 5_000,
  })
}
