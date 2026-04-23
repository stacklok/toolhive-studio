import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroupsOptions } from '@common/api/generated/@tanstack/react-query.gen'

export function useGroups() {
  return useQuery({
    ...getApiV1BetaGroupsOptions(),
    staleTime: 5_000,
  })
}
