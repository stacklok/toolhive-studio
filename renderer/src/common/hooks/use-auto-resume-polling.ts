import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  pollServerDelete,
  pollServerUntilStable,
  pollingBaseKey,
  TRANSITION_STATUSES,
} from '@/common/lib/polling'
import { fetchPollingQuery } from '@/common/lib/polling-query'
import {
  getApiV1BetaWorkloadsByNameStatusOptions,
  getApiV1BetaWorkloadsQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import type { CoreWorkload } from '@common/api/generated/types.gen'

/**
 * Detects servers in transition statuses (e.g. from CLI actions) and polls
 * until stable, then refreshes the workloads list. Deduplicates against
 * in-flight mutation polls via the TanStack Query cache.
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

      // Stable → clear ref so future transitions can be picked up
      if (!status || !TRANSITION_STATUSES.includes(status)) {
        initiatedRef.current.delete(name)
        continue
      }

      if (initiatedRef.current.has(name)) continue

      // Skip if any polling variant is already in-flight (e.g. from a mutation hook)
      const existingQuery = queryClient
        .getQueryCache()
        .findAll({ queryKey: pollingBaseKey(name) })
        .find((q) => q.state.fetchStatus === 'fetching')

      if (existingQuery) continue

      initiatedRef.current.add(name)

      // "removing" → poll until 404; others → poll until non-transition status
      const fetchStatus = () =>
        queryClient.fetchQuery(
          getApiV1BetaWorkloadsByNameStatusOptions({ path: { name } })
        )

      const isRemoving = status === 'removing'
      const variant = isRemoving ? 'delete' : 'stable'
      const pollFn = isRemoving
        ? () => pollServerDelete(fetchStatus)
        : () => pollServerUntilStable(fetchStatus)

      fetchPollingQuery(queryClient, name, variant, pollFn)
        .then((success) => {
          if (success) {
            queryClient.invalidateQueries({
              queryKey: getApiV1BetaWorkloadsQueryKey({
                query: { all: true, group: groupName },
              }),
            })
          } else {
            initiatedRef.current.delete(name)
          }
        })
        .catch(() => {
          initiatedRef.current.delete(name)
        })
    }
  }, [workloads, groupName, queryClient])
}
