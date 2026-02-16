import type {
  V1WorkloadListResponse,
  CoreWorkload,
} from '@common/api/generated/types.gen'
import {
  postApiV1BetaWorkloadsByNameRestartMutation,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameStatusOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollServerStatus } from '@/common/lib/polling'
import { fetchPollingQuery } from '@/common/lib/polling-query'
import { useQueryClient } from '@tanstack/react-query'
import { useNotificationOptimizer } from './use-notification-optimizer'

const getMutationData = (name: string) => ({
  ...postApiV1BetaWorkloadsByNameRestartMutation(),
  successMsg: `Server ${name} started successfully`,
  errorMsg: `Failed to start server ${name}`,
  loadingMsg: `Starting server ${name}...`,
})

export function useMutationRestartServer({
  name,
  group,
}: {
  name: string
  group?: string
}) {
  const queryClient = useQueryClient()
  const queryKey = getApiV1BetaWorkloadsQueryKey({
    query: { all: true, group: group ?? 'default' },
  })
  const notifyChangeWithOptimizer = useNotificationOptimizer()

  return useToastMutation({
    ...getMutationData(name),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })

      const previousData = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(
        queryKey,
        (oldData: V1WorkloadListResponse | undefined) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            workloads: oldData.workloads?.map((server: CoreWorkload) =>
              server.name === name
                ? { ...server, status: 'restarting' }
                : server
            ),
          }
        }
      )

      return { previousData }
    },
    onSuccess: async () => {
      // Poll until server running
      await fetchPollingQuery(queryClient, name, 'running', () =>
        pollServerStatus(
          () =>
            queryClient.fetchQuery(
              getApiV1BetaWorkloadsByNameStatusOptions({
                path: { name },
              })
            ),
          'running'
        )
      )
      notifyChangeWithOptimizer(group ?? 'default')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        const queryKey = getApiV1BetaWorkloadsQueryKey({
          query: { all: true, group: group ?? 'default' },
        })
        queryClient.setQueryData(queryKey, context.previousData)
      }
    },
  })
}
