import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  postApiV1BetaWorkloadsByNameEditMutation,
  getApiV1BetaWorkloadsQueryKey,
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
        // If the query data doesn't exist yet (e.g., moving to a new group), skip optimistic update
        if (!old) {
          return old
        }

        const newWorkloads = old.workloads?.map((server) =>
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
    onSettled: (_data, _error, variables) => {
      const queryKey = getApiV1BetaWorkloadsQueryKey({
        query: { all: true, group: variables.body.group },
      })
      queryClient.refetchQueries({ queryKey })
    },
  })

  return updateWorkload
}
