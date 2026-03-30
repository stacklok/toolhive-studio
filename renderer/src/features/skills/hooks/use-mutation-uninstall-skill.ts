import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteApiV1BetaSkillsByNameMutation,
  getApiV1BetaSkillsQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import { toast } from 'sonner'

export function useMutationUninstallSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    ...deleteApiV1BetaSkillsByNameMutation(),
    onSuccess: (_data, variables) => {
      const skillName = variables.path.name
      toast.success(`${skillName} uninstalled successfully`)
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaSkillsQueryKey(),
      })
    },
    onError: () => {
      toast.error('Failed to uninstall skill')
    },
  })
}
