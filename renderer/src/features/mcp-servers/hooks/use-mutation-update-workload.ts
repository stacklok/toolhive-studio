import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  postApiV1BetaWorkloadsByNameEditMutation,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameOptions,
  getApiV1BetaWorkloadsByNameQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import type { V1UpdateRequest, V1WorkloadListResponse } from '@common/api/generated/types.gen'

export const useMutationUpdateWorkload = () => {
  const queryClient = useQueryClient()
  const { mutateAsync: updateWorkload } = useMutation({
    ...postApiV1BetaWorkloadsByNameEditMutation(),
    onMutate: async ({
      path,
      body,
    }: {
      path: { name: string }
      body: V1UpdateRequest
    }) => {
      const queryKey = getApiV1BetaWorkloadsQueryKey({
        query: { all: true, group: body.group },
      })
      await queryClient.cancelQueries({ queryKey })
      const previousServersList =
        queryClient.getQueryData<V1WorkloadListResponse>(queryKey)

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
    onError: (_error, _variables, onMutateResult) => {
      if (onMutateResult?.queryKey && onMutateResult?.previousServersList) {
        queryClient.setQueryData(
          onMutateResult?.queryKey,
          onMutateResult.previousServersList
        )
      }
    },
    onSettled: async (_data, _error, variables, onMutateResult) => {
      const workloads = onMutateResult?.previousServersList?.workloads ?? []
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
        await Promise.all([
          queryClient.refetchQueries({ queryKey: workloadsQueryKey }),
          queryClient.refetchQueries({ queryKey: workloadDetailQueryKey }),
        ])
      }
    },
  })

  return updateWorkload
}
