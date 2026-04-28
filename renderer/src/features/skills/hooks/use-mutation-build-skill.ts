import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  postApiV1BetaSkillsBuildMutation,
  getApiV1BetaSkillsBuildsQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import { trackEvent } from '@/common/lib/analytics'

export function useMutationBuildSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    ...postApiV1BetaSkillsBuildMutation(),
    onSuccess: (data, variables) => {
      trackEvent('Skills: build succeeded', {
        has_tag: variables.body?.tag ? 'true' : 'false',
        has_reference: data?.reference ? 'true' : 'false',
      })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaSkillsBuildsQueryKey(),
      })
    },
    onError: (_error, variables) => {
      trackEvent('Skills: build failed', {
        has_tag: variables.body?.tag ? 'true' : 'false',
      })
    },
  })
}
