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
    onMutate: async (variables) => {
      const serverNames = variables.body.names

      if (!serverNames || serverNames.length === 0) {
        return
      }

      const shutdownServers =
        await window.electronAPI.shutdownStore.getLastShutdownServers()

      // Cancel all outgoing queries to prevent race conditions
      await queryClient.cancelQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })

      // Snapshot all current query data for rollback
      const previousData = new Map()
      queryClient
        .getQueryCache()
        .findAll({
          queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
        })
        .forEach((query) => {
          previousData.set(query.queryKey, query.state.data)
        })

      // Optimistically update all group caches
      queryClient
        .getQueryCache()
        .findAll({
          queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
        })
        .forEach((query) => {
          queryClient.setQueryData(
            query.queryKey,
            (oldData: V1WorkloadListResponse | undefined) => {
              if (!oldData) return oldData

              const seenNames = new Set<string>()
              const workloads = [
                ...(oldData.workloads ?? []),
                ...shutdownServers,
              ].filter((server) => {
                if (server.name && !seenNames.has(server.name)) {
                  seenNames.add(server.name)
                  return true
                }
                return false
              })

              return {
                ...oldData,
                workloads: workloads?.map((server: CoreWorkload) =>
                  serverNames.includes(server.name || '')
                    ? { ...server, status: 'restarting' }
                    : server
                ),
              }
            }
          )
        })

      return { previousData }
    },
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
          return statusResponses.map((response, index) => ({
            name: names[index],
            status: response.status || 'unknown',
          })) as CoreWorkload[]
        },
        serverNames,
        'running'
      )

      await window.electronAPI.shutdownStore.clearShutdownHistory()

      // Invalidate all workload queries (all groups) to refetch with correct state
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })
    },
    onError: (_error, _variables, context) => {
      // Rollback all optimistic updates
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
  })
}

export function useMutationRestartServer({ name }: { name: string }) {
  const queryClient = useQueryClient()

  return useToastMutation({
    ...getMutationData(name),
    onMutate: async () => {
      // Cancel all outgoing queries to prevent race conditions
      await queryClient.cancelQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })

      // Snapshot all current query data for rollback
      const previousData = new Map()
      queryClient
        .getQueryCache()
        .findAll({
          queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
        })
        .forEach((query) => {
          previousData.set(query.queryKey, query.state.data)
        })

      // Optimistically update all group caches
      queryClient
        .getQueryCache()
        .findAll({
          queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
        })
        .forEach((query) => {
          queryClient.setQueryData(
            query.queryKey,
            (oldData: V1WorkloadListResponse | undefined) => {
              if (!oldData) return oldData

              return {
                ...oldData,
                workloads: oldData.workloads?.map((server: CoreWorkload) =>
                  server.name === name
                    ? { ...server, status: 'restarting' }
                    : server
                ),
              }
            }
          )
        })

      return { previousData }
    },
    onSuccess: () => {
      // Invalidate all workload queries (all groups) to refetch with correct status
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })
    },
    onError: (_error, _variables, context) => {
      // Rollback all optimistic updates
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
  })
}
