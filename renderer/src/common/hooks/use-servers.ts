import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloads } from '../api/generated'

export function useServers() {
  return useQuery({
    queryKey: ['workloads'],
    queryFn: () => getApiV1BetaWorkloads(),
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  })
}
