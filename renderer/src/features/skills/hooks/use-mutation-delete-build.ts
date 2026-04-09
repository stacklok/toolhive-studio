import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteApiV1BetaSkillsBuildsByTagMutation,
  getApiV1BetaSkillsBuildsQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import { toast } from 'sonner'

export function useMutationDeleteBuild() {
  const queryClient = useQueryClient()

  return useMutation({
    ...deleteApiV1BetaSkillsBuildsByTagMutation(),
    onSuccess: (_data, variables) => {
      const tag = variables.path.tag
      toast.success(`${tag} removed successfully`)
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaSkillsBuildsQueryKey(),
      })
    },
    onError: () => {
      toast.error('Failed to remove build')
    },
  })
}
