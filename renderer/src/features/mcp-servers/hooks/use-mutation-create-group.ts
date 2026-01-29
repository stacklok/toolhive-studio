import { useQueryClient } from '@tanstack/react-query'
import { postApiV1BetaGroups } from '@common/api/generated/sdk.gen'
import { getApiV1BetaGroupsQueryKey } from '@common/api/generated/@tanstack/react-query.gen'
import type { PostApiV1BetaGroupsData } from '@common/api/generated/types.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { trackEvent } from '@/common/lib/analytics'
import { useGroups } from './use-groups'

export function useMutationCreateGroup(options?: {
  successMsg?:
    | ((variables: Pick<PostApiV1BetaGroupsData, 'body'>) => string | null)
    | string
    | null
}) {
  const queryClient = useQueryClient()
  const { data: groupsData } = useGroups()

  return useToastMutation({
    mutationFn: async (data: Pick<PostApiV1BetaGroupsData, 'body'>) => {
      return await postApiV1BetaGroups({
        body: data.body,
        parseAs: 'json',
        responseStyle: 'data',
        throwOnError: true,
      })
    },
    onSuccess: (_, variables) => {
      const existingGroupsCount = groupsData?.groups?.length ?? 0
      const newGroupName = variables.body.name
      trackEvent(`Group created: ${newGroupName}`, {
        existing_groups_count: existingGroupsCount,
        group_name: newGroupName,
      })
      queryClient.invalidateQueries({ queryKey: getApiV1BetaGroupsQueryKey() })
    },
    successMsg:
      options?.successMsg !== undefined
        ? options.successMsg
        : (variables) => `Group "${variables.body.name}" created successfully`,
    loadingMsg: 'Creating group...',
  })
}
