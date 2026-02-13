import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pollServerUntilStable, pollingQueryKey } from '@/common/lib/polling'
import {
  getApiV1BetaWorkloadsByNameStatusOptions,
  getApiV1BetaWorkloadsQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import type { CoreWorkload } from '@common/api/generated/types.gen'

const TRANSITION_STATUSES = ['starting', 'restarting', 'stopping']

/**
 * Automatically resumes polling for servers stuck in transition statuses.
 *
 * When the workload list is fetched and a server has a transition status
 * (starting, restarting, stopping) — e.g. due to a CLI-initiated action —
 * this hook starts polling until the server reaches any stable status,
 * then invalidates the workloads list to refresh the UI.
 *
 * Polls until stable (not a specific target) because a server in "stopping"
 * could end up "stopped" (normal stop) or "running" (edit/restart cycle).
 *
 * Uses the TanStack Query cache with `pollingQueryKey` for deduplication:
 * if a mutation hook already started polling for the same server, no
 * duplicate poll is created. Additionally tracks initiated polls in a ref
 * to prevent re-triggering when the effect re-runs with stale workload data.
 */
export function useAutoResumePolling(
  workloads: CoreWorkload[],
  groupName: string
) {
  const queryClient = useQueryClient()
  const initiatedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    for (const server of workloads) {
      const name = server.name
      const status = server.status
      if (!name) continue

      // When a server reaches a stable state, clear it from the ref
      // so future transitions (e.g. stopped via CLI again) can be picked up
      if (!status || !TRANSITION_STATUSES.includes(status)) {
        initiatedRef.current.delete(name)
        continue
      }

      // Skip if we already initiated polling for this server
      if (initiatedRef.current.has(name)) continue

      const qKey = pollingQueryKey(name)

      // Check if a polling query is already in-flight for this server
      // (e.g. started by a mutation hook)
      const existingQuery = queryClient
        .getQueryCache()
        .find({ queryKey: qKey, fetchStatus: 'fetching' })

      if (existingQuery) continue

      initiatedRef.current.add(name)

      // Fire-and-forget: fetchQuery deduplicates by key automatically
      // Polls until ANY stable status (not a specific target) to handle
      // edit cycles where stopping -> running instead of stopping -> stopped
      queryClient
        .fetchQuery({
          queryKey: qKey,
          queryFn: () =>
            pollServerUntilStable(() =>
              queryClient.fetchQuery(
                getApiV1BetaWorkloadsByNameStatusOptions({
                  path: { name },
                })
              )
            ),
          staleTime: 0,
        })
        .then((success) => {
          if (success) {
            queryClient.invalidateQueries({
              queryKey: getApiV1BetaWorkloadsQueryKey({
                query: { all: true, group: groupName },
              }),
            })
          }
        })
    }
  }, [workloads, groupName, queryClient])
}
