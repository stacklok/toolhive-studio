import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import { queryClient } from '../lib/query-client'
import log from 'electron-log/renderer'
import { useCallback } from 'react'
import { META_MCP_SERVER_NAME } from '../lib/constants'

export function useOptimizedWorkloads() {
  const getOptimizedWorkloads = useCallback(
    async ({
      groupName,
      serverName,
    }: {
      groupName: string
      serverName?: string
    }): Promise<string[]> => {
      if (serverName !== META_MCP_SERVER_NAME) {
        return []
      }

      try {
        const workloads = await queryClient.fetchQuery(
          getApiV1BetaWorkloadsOptions({
            query: {
              all: true,
            },
            throwOnError: true,
          })
        )

        const filteredWorkloads =
          workloads?.workloads
            ?.filter(
              (workload) =>
                workload.group === groupName && workload.status === 'running'
            )
            ?.map((workload) => workload.name)
            .filter((name): name is string => name !== undefined) ?? []

        return filteredWorkloads
      } catch (error) {
        log.error('Failed to get optimized workloads', error)
        return []
      }
    },
    []
  )

  return { getOptimizedWorkloads }
}
