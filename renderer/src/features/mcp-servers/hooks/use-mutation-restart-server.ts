import type {
  V1WorkloadListResponse,
  CoreWorkload,
  V1BulkOperationRequest,
} from '@common/api/generated/types.gen'
import {
  postApiV1BetaWorkloadsByNameRestartMutation,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameStatusOptions,
  postApiV1BetaWorkloadsRestartMutation,
} from '@common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollServerStatus, pollingQueryKey } from '@/common/lib/polling'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useNotificationOptimizer } from './use-notification-optimizer'

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
      const body: V1BulkOperationRequest = variables.body
      const serverNames = body.names ?? []

      if (!serverNames || serverNames.length === 0) {
        return
      }

      const shutdownServers =
        await window.electronAPI.shutdownStore.getLastShutdownServers()

      await queryClient.cancelQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })

      const previousData = new Map()
      const queries = queryClient.getQueryCache().findAll({
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })

      queries.forEach((query) => {
        previousData.set(query.queryKey, query.state.data)

        const queryKeyGroup =
          (query.queryKey[1] as { query?: { group?: string } })?.query?.group ??
          'default'

        queryClient.setQueryData(
          query.queryKey,
          (oldData: V1WorkloadListResponse | undefined) => {
            if (!oldData) return oldData

            const groupShutdownServers = shutdownServers.filter(
              (server) => (server.group ?? 'default') === queryKeyGroup
            )

            const seenNames = new Set<string>()
            const workloads = [
              ...(oldData.workloads ?? []),
              ...groupShutdownServers,
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
      const body: V1BulkOperationRequest = variables.body
      const serverNames = body.names ?? []

      if (!serverNames || serverNames.length === 0) {
        return
      }

      // Poll until all servers are running (per-server for dedup granularity)
      await Promise.all(
        serverNames.map((serverName) =>
          queryClient.fetchQuery({
            queryKey: pollingQueryKey(serverName),
            queryFn: () =>
              pollServerStatus(
                () =>
                  queryClient.fetchQuery(
                    getApiV1BetaWorkloadsByNameStatusOptions({
                      path: { name: serverName },
                    })
                  ),
                'running'
              ),
            staleTime: 0,
          })
        )
      )

      await window.electronAPI.shutdownStore.clearShutdownHistory()

      queryClient.invalidateQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
  })
}

export function useMutationRestartServer({
  name,
  group,
}: {
  name: string
  group?: string
}) {
  const queryClient = useQueryClient()
  const queryKey = getApiV1BetaWorkloadsQueryKey({
    query: { all: true, group: group ?? 'default' },
  })
  const notifyChangeWithOptimizer = useNotificationOptimizer()

  return useToastMutation({
    ...getMutationData(name),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })

      const previousData = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(
        queryKey,
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

      return { previousData }
    },
    onSuccess: async () => {
      // Poll until server running
      await queryClient.fetchQuery({
        queryKey: pollingQueryKey(name),
        queryFn: () =>
          pollServerStatus(
            () =>
              queryClient.fetchQuery(
                getApiV1BetaWorkloadsByNameStatusOptions({
                  path: { name },
                })
              ),
            'running'
          ),
        staleTime: 0,
      })
      notifyChangeWithOptimizer(group ?? 'default')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        const queryKey = getApiV1BetaWorkloadsQueryKey({
          query: { all: true, group: group ?? 'default' },
        })
        queryClient.setQueryData(queryKey, context.previousData)
      }
    },
  })
}
