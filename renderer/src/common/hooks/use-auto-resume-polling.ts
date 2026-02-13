import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pollServerStatus, pollingQueryKey } from '@/common/lib/polling'
import {
  getApiV1BetaWorkloadsByNameStatusOptions,
  getApiV1BetaWorkloadsQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import type { CoreWorkload } from '@common/api/generated/types.gen'

const TRANSITION_TARGET: Record<string, string> = {
  starting: 'running',
  restarting: 'running',
  stopping: 'stopped',
}

/**
 * Automatically resumes polling for servers stuck in transition statuses.
 *
 * When the workload list is fetched and a server has a transition status
 * (starting, restarting, stopping) — e.g. due to a CLI-initiated action —
 * this hook starts polling until the server reaches its target stable status,
 * then invalidates the workloads list to refresh the UI.
 *
 * Uses the TanStack Query cache with `pollingQueryKey` for deduplication:
 * if a mutation hook already started polling for the same server, no
 * duplicate poll is created.
 */
export function useAutoResumePolling(
  workloads: CoreWorkload[],
  groupName: string
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    for (const server of workloads) {
      const name = server.name
      const status = server.status
      if (!name || !status || !(status in TRANSITION_TARGET)) continue

      const qKey = pollingQueryKey(name)

      // Check if a polling query is already in-flight for this server
      const existingQuery = queryClient
        .getQueryCache()
        .find({ queryKey: qKey, fetchStatus: 'fetching' })

      if (existingQuery) continue

      const targetStatus = TRANSITION_TARGET[status]
      if (!targetStatus) continue

      // Fire-and-forget: fetchQuery deduplicates by key automatically
      queryClient
        .fetchQuery({
          queryKey: qKey,
          queryFn: () =>
            pollServerStatus(
              () =>
                queryClient.fetchQuery(
                  getApiV1BetaWorkloadsByNameStatusOptions({
                    path: { name },
                  })
                ),
              targetStatus
            ),
          staleTime: 0,
          gcTime: 30_000,
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
