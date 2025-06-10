import type {
  WorkloadsWorkload,
  V1WorkloadListResponse,
} from '@/common/api/generated'
import {
  postApiV1BetaWorkloadsByNameStopMutation,
  getApiV1BetaWorkloadsByNameQueryKey,
  getApiV1BetaWorkloadsQueryKey,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useQueryClient } from '@tanstack/react-query'

const getMutationData = (name: string) => ({
  ...postApiV1BetaWorkloadsByNameStopMutation(),
  successMsg: `Server ${name} stopped successfully`,
  errorMsg: `Failed to stop server ${name}`,
  loadingMsg: `Stopping server ${name}...`,
})

export function useMutationStopServerList({ name }: { name: string }) {
  const queryClient = useQueryClient()
  // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
  const queryKey = getApiV1BetaWorkloadsQueryKey({ query: { all: true } })

  return useToastMutation({
    ...getMutationData(name),

    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey,
      })

      const previousServer = queryClient.getQueryData(
        getApiV1BetaWorkloadsByNameQueryKey({ path: { name } })
      )

      queryClient.setQueryData(
        getApiV1BetaWorkloadsByNameQueryKey({ path: { name } }),
        (oldData: WorkloadsWorkload | undefined) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            status: 'stopped',
          }
        }
      )

      queryClient.setQueryData(queryKey, (oldData: string | undefined) => {
        if (!oldData) return oldData

        const parsed: V1WorkloadListResponse = JSON.parse(oldData)
        if (!parsed?.workloads) return oldData

        const updatedData = {
          ...parsed,
          workloads: parsed.workloads.map((server: WorkloadsWorkload) =>
            server.name === name ? { ...server, status: 'stopped' } : server
          ),
        } as V1WorkloadListResponse
        // Convert to string because of https://github.com/stacklok/toolhive/issues/497
        return JSON.stringify(updatedData)
      })

      return { previousServer }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousServer) {
        queryClient.setQueryData(queryKey, context.previousServer)
      }
    },
  })
}

export function useMutationStopServer({ name }: { name: string }) {
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
          status: 'stopped',
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
