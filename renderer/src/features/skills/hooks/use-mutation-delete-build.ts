import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteApiV1BetaSkillsBuildsByTagMutation,
  getApiV1BetaSkillsBuildsQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import { toast } from 'sonner'
import { trackEvent } from '@/common/lib/analytics'

export function useMutationDeleteBuild() {
  const queryClient = useQueryClient()

  return useMutation({
    ...deleteApiV1BetaSkillsBuildsByTagMutation(),
    onSuccess: (_data, variables) => {
      const tag = variables.path.tag
      toast.success(`${tag} removed successfully`)
      trackEvent('Skills: delete build succeeded', { tag })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaSkillsBuildsQueryKey(),
      })
    },
    onError: (_error, variables) => {
      toast.error('Failed to remove build')
      trackEvent('Skills: delete build failed', { tag: variables.path.tag })
    },
  })
}
