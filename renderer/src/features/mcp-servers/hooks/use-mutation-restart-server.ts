import type {
  V1WorkloadListResponse,
  WorkloadsWorkload,
} from '@/common/api/generated'
import {
  postApiV1BetaWorkloadsByNameRestartMutation,
  getApiV1BetaWorkloadsByNameQueryKey,
  getApiV1BetaWorkloadsQueryKey,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'

const getMutationData = (name: string) => ({
  ...postApiV1BetaWorkloadsByNameRestartMutation(),
  successMsg: `Server ${name} restarted successfully`,
  errorMsg: `Failed to restart server ${name}`,
  loadingMsg: `Restarting server ${name}...`,
})

export function useMutationRestartServerList({ name }: { name: string }) {
  const queryClient = useQueryClient()
  // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
  const queryKey = getApiV1BetaWorkloadsQueryKey({ query: { all: true } })

  return useToastMutation({
    ...getMutationData(name),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })

      const previousServersList = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (oldData: string | undefined) => {
        if (!oldData) return oldData

        const parsed = JSON.parse(oldData)
        if (!parsed?.workloads) return oldData

        const updatedData = {
          ...parsed,
          workloads: parsed.workloads.map((server: WorkloadsWorkload) =>
            server.name === name ? { ...server, status: 'running' } : server
          ),
        } as V1WorkloadListResponse
        // Convert to string because of https://github.com/stacklok/toolhive/issues/497
        return JSON.stringify(updatedData)
      })

      return { previousServersList }
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
  const queryKey = getApiV1BetaWorkloadsByNameQueryKey({ path: { name } })
  return useToastMutation({
    ...getMutationData(name),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })

      const previousServerData = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (oldData: string | undefined) => {
        if (!oldData) return oldData

        const parsed = JSON.parse(oldData)
        if (!parsed) return oldData

        const updatedData = {
          ...parsed,
          status: 'running',
        } as WorkloadsWorkload
        // Convert to string because of https://github.com/stacklok/toolhive/issues/497
        return JSON.stringify(updatedData)
      })

      return { previousServerData }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousServerData) {
        queryClient.setQueryData(queryKey, context.previousServerData)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })
    },
  })
}
