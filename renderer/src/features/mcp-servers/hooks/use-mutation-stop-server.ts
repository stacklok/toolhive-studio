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
  const queryKey = getApiV1BetaWorkloadsQueryKey({ query: { all: true } })
  const serverQueryKey = getApiV1BetaWorkloadsByNameQueryKey({
    path: { name },
  })
  return useToastMutation({
    ...getMutationData(name),

    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey,
      })

      const previousServer = queryClient.getQueryData(serverQueryKey)

      queryClient.setQueryData(
        serverQueryKey,
        (oldData: WorkloadsWorkload | undefined) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            status: 'stopping',
          }
        }
      )

      queryClient.setQueryData(
        queryKey,
        (oldData: V1WorkloadListResponse | undefined) => {
          if (!oldData) return oldData

          const updatedData = {
            ...oldData,
            workloads: oldData.workloads?.map((server: WorkloadsWorkload) =>
              server.name === name ? { ...server, status: 'stopping' } : server
            ),
          } as V1WorkloadListResponse
          return updatedData
        }
      )

      return { previousServer }
    },
    onSuccess: () => {
      queryClient.setQueryData(
        queryKey,
        (oldData: V1WorkloadListResponse | undefined) => {
          if (!oldData) return oldData
          return { ...oldData, status: 'stopped' }
        }
      )
      queryClient.setQueryData(
        serverQueryKey,
        (oldData: WorkloadsWorkload | undefined) => {
          if (!oldData) return oldData
          return { ...oldData, status: 'stopped' }
        }
      )
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

      queryClient.setQueryData(
        queryKey,
        (oldData: WorkloadsWorkload | undefined) => {
          if (!oldData) return oldData

          const updatedData = {
            ...oldData,
            status: 'stopping',
          } as WorkloadsWorkload
          return updatedData
        }
      )

      return { previousServerData }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousServerData) {
        queryClient.setQueryData(queryKey, context.previousServerData)
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(
        queryKey,
        (oldData: WorkloadsWorkload | undefined) => {
          if (!oldData) return oldData

          return { ...oldData, status: 'stopped' }
        }
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })
    },
  })
}
