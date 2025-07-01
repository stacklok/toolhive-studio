import type {
  V1WorkloadListResponse,
  WorkloadsWorkload,
} from '@/common/api/generated'
import {
  postApiV1BetaWorkloadsByNameRestartMutation,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameOptions,
  postApiV1BetaWorkloadsRestartMutation,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollBatchServerStatus } from '@/common/lib/polling'
import { useQueryClient } from '@tanstack/react-query'

const getMutationData = (name: string) => ({
  ...postApiV1BetaWorkloadsByNameRestartMutation(),
  successMsg: `Server ${name} started successfully`,
  errorMsg: `Failed to start server ${name}`,
  loadingMsg: `Starting server ${name}...`,
})

export function useMutationRestartServerAtStartup() {
  const queryClient = useQueryClient()
  const queryKey = getApiV1BetaWorkloadsQueryKey({ query: { all: true } })

  return useToastMutation({
    successMsg: 'Servers restarted successfully',
    errorMsg: 'Failed to restart servers',
    loadingMsg: 'Restarting servers...',
    ...postApiV1BetaWorkloadsRestartMutation(),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey })
      const previousServersList = queryClient.getQueryData(queryKey)
      const serverNames = variables.body.names

      if (!serverNames || serverNames.length === 0) {
        return { previousServersList }
      }

      const shutdownServers =
        await window.electronAPI.shutdownStore.getLastShutdownServers()

      queryClient.setQueryData(
        queryKey,
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

          const updatedData = {
            ...oldData,
            workloads: workloads?.map((server: WorkloadsWorkload) =>
              serverNames.includes(server.name || '')
                ? { ...server, status: 'restarting' }
                : server
            ),
          }
          return updatedData
        }
      )

      return { previousServersList }
    },
    onSuccess: async (_data, variables) => {
      const serverNames = variables.body.names

      if (!serverNames || serverNames.length === 0) {
        return
      }

      // Poll until all servers are running
      await pollBatchServerStatus(
        async (names) => {
          const servers = await Promise.all(
            names.map((name) =>
              queryClient.fetchQuery(
                getApiV1BetaWorkloadsByNameOptions({ path: { name } })
              )
            )
          )
          return servers
        },
        serverNames,
        'running'
      )

      await window.electronAPI.shutdownStore.clearShutdownHistory()
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (_error, _variables, context) => {
      if (context?.previousServersList) {
        queryClient.setQueryData(queryKey, context.previousServersList)
      }
    },
  })
}

export function useMutationRestartServer({ name }: { name: string }) {
  const queryClient = useQueryClient()
  const queryKey = getApiV1BetaWorkloadsQueryKey({ query: { all: true } })

  return useToastMutation({
    ...getMutationData(name),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })

      const previousServersList = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(
        queryKey,
        (oldData: V1WorkloadListResponse | undefined) => {
          if (!oldData) return oldData

          const updatedData = {
            ...oldData,
            workloads: oldData.workloads?.map((server: WorkloadsWorkload) =>
              server.name === name ? { ...server, status: 'running' } : server
            ),
          }
          return updatedData
        }
      )

      return { previousServersList }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousServersList) {
        queryClient.setQueryData(queryKey, context.previousServersList)
      }
    },
  })
}
