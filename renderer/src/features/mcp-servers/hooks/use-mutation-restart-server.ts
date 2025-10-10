import type { V1WorkloadListResponse, CoreWorkload } from '@api/types.gen'
import {
  postApiV1BetaWorkloadsByNameRestartMutation,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameStatusOptions,
  postApiV1BetaWorkloadsRestartMutation,
} from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollBatchServerStatus } from '@/common/lib/polling'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'

const TOAST_ID = 'restart-servers-startup'

const getMutationData = (name: string) => ({
  ...postApiV1BetaWorkloadsByNameRestartMutation(),
  successMsg: `Server ${name} started successfully`,
  errorMsg: `Failed to start server ${name}`,
  loadingMsg: `Starting server ${name}...`,
})

export function useMutationRestartServerAtStartup() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const cleanup = window.electronAPI.onServerShutdown(() => {
      toast.dismiss(TOAST_ID)
    })

    return cleanup
  }, [])

  return useToastMutation({
    successMsg: 'Servers restarted successfully',
    errorMsg: 'Failed to restart servers',
    loadingMsg: 'Restarting servers...',
    toastId: TOAST_ID,
    ...postApiV1BetaWorkloadsRestartMutation(),
    onSuccess: async (_data, variables) => {
      const serverNames = variables.body.names

      if (!serverNames || serverNames.length === 0) {
        return
      }

      // Poll until all servers are running
      await pollBatchServerStatus(
        async (names) => {
          const statusResponses = await Promise.all(
            names.map((name) =>
              queryClient.fetchQuery(
                getApiV1BetaWorkloadsByNameStatusOptions({ path: { name } })
              )
            )
          )
          // Convert status responses to CoreWorkload-like objects for polling
          return statusResponses.map((response, index) => ({
            name: names[index],
            status: response.status || 'unknown',
          })) as CoreWorkload[]
        },
        serverNames,
        'running'
      )

      await window.electronAPI.shutdownStore.clearShutdownHistory()

      // Invalidate all workload queries to refetch with correct groups
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })
    },
  })
}

export function useMutationRestartServer({ name }: { name: string }) {
  const queryClient = useQueryClient()
  const baseQueryKey = getApiV1BetaWorkloadsQueryKey({ query: { all: true } })

  return useToastMutation({
    ...getMutationData(name),
    onMutate: async () => {
      // Cancel all outgoing workload queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: baseQueryKey })

      // Get all matching query caches (for all groups)
      const previousCaches = new Map<string, V1WorkloadListResponse>()
      const queryCache = queryClient.getQueryCache()

      queryCache.findAll({ queryKey: baseQueryKey }).forEach((query) => {
        const data = query.state.data as V1WorkloadListResponse | undefined
        if (data) {
          previousCaches.set(JSON.stringify(query.queryKey), data)

          // Optimistically update this query's cache
          queryClient.setQueryData(query.queryKey, {
            ...data,
            workloads: data.workloads?.map((server: CoreWorkload) =>
              server.name === name ? { ...server, status: 'running' } : server
            ),
          })
        }
      })

      return { previousCaches }
    },

    onError: (_error, _variables, context) => {
      // Rollback all optimistic updates on error
      if (context?.previousCaches) {
        context.previousCaches.forEach((data, queryKeyStr) => {
          const queryKey = JSON.parse(queryKeyStr)
          queryClient.setQueryData(queryKey, data)
        })
      }
    },

    onSuccess: () => {
      // Invalidate all workload queries to refetch with correct status
      queryClient.invalidateQueries({
        queryKey: baseQueryKey,
      })
    },
  })
}
