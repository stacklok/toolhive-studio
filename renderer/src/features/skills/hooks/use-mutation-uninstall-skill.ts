import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteApiV1BetaSkillsByNameMutation,
  getApiV1BetaSkillsQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import { toast } from 'sonner'
import { trackEvent } from '@/common/lib/analytics'

export function useMutationUninstallSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    ...deleteApiV1BetaSkillsByNameMutation(),
    onSuccess: (_data, variables) => {
      const skillName = variables.path.name
      toast.success(`${skillName} uninstalled successfully`)
      trackEvent('Skills: uninstall succeeded', {
        skill_name: skillName,
        scope: variables.query?.scope ?? 'unknown',
        has_project_root: variables.query?.project_root ? 'true' : 'false',
      })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaSkillsQueryKey(),
      })
    },
    onError: (_error, variables) => {
      toast.error('Failed to uninstall skill')
      trackEvent('Skills: uninstall failed', {
        skill_name: variables.path.name,
        scope: variables.query?.scope ?? 'unknown',
      })
    },
  })
}
