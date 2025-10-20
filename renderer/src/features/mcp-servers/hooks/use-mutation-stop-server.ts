import type { CoreWorkload, V1WorkloadListResponse } from '@api/types.gen'
import {
  postApiV1BetaWorkloadsByNameStopMutation,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameStatusOptions,
} from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollBatchServerStatus } from '@/common/lib/polling'
import { useQueryClient } from '@tanstack/react-query'

const getMutationData = (name: string) => ({
  ...postApiV1BetaWorkloadsByNameStopMutation(),
  successMsg: `Server ${name} stopped successfully`,
  errorMsg: `Failed to stop server ${name}`,
  loadingMsg: `Stopping server ${name}...`,
})

export function useMutationStopServerList({
  name,
  group = 'default',
}: {
  name: string
  group?: string
}) {
  const queryClient = useQueryClient()
  const queryKey = getApiV1BetaWorkloadsQueryKey({
    query: { all: true, group: group },
  })
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
            workloads: oldData.workloads?.map((server: CoreWorkload) =>
              server.name === name ? { ...server, status: 'stopping' } : server
            ),
          }
          return updatedData
        }
      )

      return { previousServersList }
    },
    onSuccess: async () => {
      // Poll until server stopped
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
          }))
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
