import { useEffect, useRef } from 'react'
import type {
  V1WorkloadListResponse,
  CoreWorkload,
  V1BulkOperationRequest,
} from '@common/api/generated/types.gen'
import {
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsOptions,
  getApiV1BetaWorkloadsByNameStatusOptions,
  postApiV1BetaWorkloadsRestartMutation,
} from '@common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollServerStatus } from '@/common/lib/polling'
import { fetchPollingQuery } from '@/common/lib/polling-query'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const TOAST_ID = 'restart-servers-startup'

function useMutationRestartServerAtStartup() {
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
              (server) =>
                (server.group ?? 'default') === queryKeyGroup &&
                serverNames.includes(server.name!)
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
          fetchPollingQuery(queryClient, serverName, 'running', () =>
            pollServerStatus(
              () =>
                queryClient.fetchQuery(
                  getApiV1BetaWorkloadsByNameStatusOptions({
                    path: { name: serverName },
                  })
                ),
              'running'
            )
          )
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

export function useRestartShutdownServers() {
  const queryClient = useQueryClient()
  const { mutateAsync } = useMutationRestartServerAtStartup()
  const hasProcessedShutdown = useRef(false)

  useEffect(() => {
    const handleShutdownRestart = async () => {
      try {
        if (hasProcessedShutdown.current) return
        hasProcessedShutdown.current = true

        const shutdownServers =
          await window.electronAPI.shutdownStore.getLastShutdownServers()
        if (shutdownServers.length === 0) return

        // Fetch all current workloads to verify shutdown servers still exist
        // (they may have been removed via the CLI while the app was stopped)
        const allWorkloads = await queryClient.fetchQuery(
          getApiV1BetaWorkloadsOptions({ query: { all: true } })
        )
        const existingNames = new Set(
          (allWorkloads?.workloads ?? []).map((w) => w.name).filter(Boolean)
        )
        const validNames = shutdownServers
          .map((s) => s.name!)
          .filter((name) => existingNames.has(name))

        if (validNames.length === 0) {
          await window.electronAPI.shutdownStore.clearShutdownHistory()
          return
        }

        await mutateAsync({
          body: { names: validNames },
        })
      } catch (error) {
        console.error('Error during shutdown server restart:', error)
      }
    }

    handleShutdownRestart()
  }, [mutateAsync, queryClient])
}
