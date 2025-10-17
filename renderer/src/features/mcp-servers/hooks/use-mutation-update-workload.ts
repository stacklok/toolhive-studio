import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  postApiV1BetaWorkloadsByNameEditMutation,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameOptions,
  getApiV1BetaWorkloadsByNameQueryKey,
} from '@api/@tanstack/react-query.gen'
import type { V1WorkloadListResponse } from '@api/types.gen'

export const useMutationUpdateWorkload = () => {
  const queryClient = useQueryClient()
  const { mutateAsync: updateWorkload } = useMutation({
    ...postApiV1BetaWorkloadsByNameEditMutation(),
    onMutate: async ({ path, body }) => {
      const queryKey = getApiV1BetaWorkloadsQueryKey({
        query: { all: true, group: body.group },
      })
      await queryClient.cancelQueries({ queryKey })
      const previousServersList = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: V1WorkloadListResponse) => {
        const newWorkloads = old?.workloads?.map((server) =>
          server.name === path.name ? { ...server, status: 'updating' } : server
        )
        return {
          ...old,
          workloads: newWorkloads,
        }
      })
      return { queryKey, previousServersList }
    },
    onError: (_error, _variables, context) => {
      if (context?.queryKey && context?.previousServersList) {
        queryClient.setQueryData(context?.queryKey, context.previousServersList)
      }
    },
    onSettled: async (_data, _error, variables, cachedResult) => {
      const workloads =
        (cachedResult?.previousServersList as V1WorkloadListResponse)
          ?.workloads ?? []
      // Only refetch workloads without cached data, as servers may be temporarily unavailable during restart.
      if (
        !workloads.some((workload) => workload.name === variables.path.name)
      ) {
        const workloadDetail = await queryClient.fetchQuery(
          getApiV1BetaWorkloadsByNameOptions({
            path: { name: variables.path.name },
          })
        )
        const workloadsQueryKey = getApiV1BetaWorkloadsQueryKey({
          query: { all: true, group: workloadDetail.group ?? 'default' },
        })
        const workloadDetailQueryKey = getApiV1BetaWorkloadsByNameQueryKey({
          path: { name: variables.path.name },
        })

        queryClient.refetchQueries({ queryKey: workloadsQueryKey })
        queryClient.refetchQueries({ queryKey: workloadDetailQueryKey })
      }
    },
  })

  return updateWorkload
}
