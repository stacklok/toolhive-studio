import type { QueryClient } from '@tanstack/react-query'
import { pollingQueryKey } from './polling'

/**
 * Wraps a polling function in a TanStack Query fetchQuery call using the
 * shared pollingQueryKey. This ensures polling is deduplicated across
 * mutation hooks and the auto-resume polling hook.
 *
 * The `variant` parameter disambiguates concurrent poll types for the same
 * server (e.g. 'running' vs 'stable' vs 'delete') so TanStack Query does
 * not incorrectly deduplicate polls with different completion criteria.
 */
export function fetchPollingQuery<T>(
  queryClient: QueryClient,
  serverName: string,
  variant: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return queryClient.fetchQuery({
    queryKey: pollingQueryKey(serverName, variant),
    queryFn,
    staleTime: 0,
  })
}
