import type {
  CoreWorkload,
  V1WorkloadListResponse,
} from '@common/api/generated/types.gen'
import {
  postApiV1BetaWorkloadsByNameStopMutation,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameStatusOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollServerStatus } from '@/common/lib/polling'
import { fetchPollingQuery } from '@/common/lib/polling-query'
import { useQueryClient } from '@tanstack/react-query'
import { useNotificationOptimizer } from './use-notification-optimizer'

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
  const notifyChangeWithOptimizer = useNotificationOptimizer()

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
      await fetchPollingQuery(queryClient, name, () =>
        pollServerStatus(
          () =>
            queryClient.fetchQuery(
              getApiV1BetaWorkloadsByNameStatusOptions({
                path: { name },
              })
            ),
          'stopped'
        )
      )
      notifyChangeWithOptimizer(group)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (_error, _variables, context) => {
      if (context?.previousServersList) {
        queryClient.setQueryData(queryKey, context.previousServersList)
      }
    },
  })
}
