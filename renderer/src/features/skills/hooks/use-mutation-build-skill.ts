import { useMutation } from '@tanstack/react-query'
import { postApiV1BetaSkillsBuildMutation } from '@common/api/generated/@tanstack/react-query.gen'
import { toast } from 'sonner'

export function useMutationBuildSkill() {
  return useMutation({
    ...postApiV1BetaSkillsBuildMutation(),
    onError: () => {
      toast.error('Failed to build skill')
    },
  })
}
