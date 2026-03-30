import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  postApiV1BetaSkillsMutation,
  getApiV1BetaSkillsQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import { toast } from 'sonner'

export function useMutationInstallSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    ...postApiV1BetaSkillsMutation(),
    onSuccess: (data) => {
      const skillName =
        data?.skill?.metadata?.name ?? data?.skill?.reference ?? 'Skill'
      toast.success(`${skillName} installed successfully`)
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaSkillsQueryKey(),
      })
    },
    onError: () => {
      toast.error('Failed to install skill')
    },
  })
}
