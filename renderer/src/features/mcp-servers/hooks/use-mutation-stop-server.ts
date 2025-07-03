import type {
  WorkloadsWorkload,
  V1WorkloadListResponse,
} from '@/common/api/generated'
import {
  postApiV1BetaWorkloadsByNameStopMutation,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameOptions,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollBatchServerStatus } from '@/common/lib/polling'
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
  return useToastMutation({
    ...getMutationData(name),

    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey,
      })

      const previousServersList = queryClient.getQueryData(queryKey)

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

      return { previousServersList }
    },
    onSuccess: async () => {
      // Poll until server stopped
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
        [name],
        'stopped'
      )
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (_error, _variables, context) => {
      if (context?.previousServersList) {
        queryClient.setQueryData(queryKey, context.previousServersList)
      }
    },
  })
}
