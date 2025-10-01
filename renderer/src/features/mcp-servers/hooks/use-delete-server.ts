import type { V1WorkloadListResponse, CoreWorkload } from '@api/types.gen'
import {
  deleteApiV1BetaWorkloadsByNameMutation,
  getApiV1BetaWorkloadsByNameStatusOptions,
  getApiV1BetaWorkloadsQueryKey,
} from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollServerDelete } from '@/common/lib/polling'
import { useQueryClient } from '@tanstack/react-query'

export function useDeleteServer({ name }: { name: string }) {
  const queryClient = useQueryClient()
  const queryKey = getApiV1BetaWorkloadsQueryKey({ query: { all: true } })

  return useToastMutation({
    successMsg: `Server ${name} deleted successfully`,
    errorMsg: `Failed to delete server ${name}`,
    loadingMsg: `Deleting server ${name}...`,
    ...deleteApiV1BetaWorkloadsByNameMutation(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previousServersList = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(
        queryKey,
        (oldData: V1WorkloadListResponse | undefined) => {
          if (!oldData) return oldData

          const updatedData = {
            ...oldData,
            workloads: oldData.workloads?.map((server: CoreWorkload) =>
              server.name === name ? { ...server, status: 'deleting' } : server
            ),
          }
          return updatedData
        }
      )

      return { previousServersList }
    },
    onSuccess: async () => {
      await pollServerDelete(() =>
        queryClient.fetchQuery(
          getApiV1BetaWorkloadsByNameStatusOptions({
            path: { name },
          })
        )
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey,
      })
    },
    onError: (_error, _variables, context) => {
      if (context?.previousServersList) {
        queryClient.setQueryData(queryKey, context.previousServersList)
      }
    },
  })
}
