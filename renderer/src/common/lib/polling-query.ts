import type { QueryClient } from '@tanstack/react-query'
import { pollingQueryKey } from './polling'

/**
 * Wraps a polling function in a TanStack Query fetchQuery call using the
 * shared pollingQueryKey. This ensures polling is deduplicated across
 * mutation hooks and the auto-resume polling hook.
 */
export function fetchPollingQuery<T>(
  queryClient: QueryClient,
  serverName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return queryClient.fetchQuery({
    queryKey: pollingQueryKey(serverName),
    queryFn,
    staleTime: 0,
  })
}
