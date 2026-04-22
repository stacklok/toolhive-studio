import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  postApiV1BetaSkillsMutation,
  getApiV1BetaSkillsQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import { toast } from 'sonner'
import { trackEvent } from '@/common/lib/analytics'

export function useMutationInstallSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    ...postApiV1BetaSkillsMutation(),
    onSuccess: (data, variables) => {
      const skillName =
        data?.skill?.metadata?.name ?? data?.skill?.reference ?? 'Skill'
      toast.success(`${skillName} installed successfully`)
      trackEvent('Skills: install succeeded', {
        skill_name: skillName,
        scope: variables.body.scope,
        has_version: variables.body.version ? 'true' : 'false',
        clients_count: variables.body.clients?.length ?? 0,
      })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaSkillsQueryKey(),
      })
    },
    onError: (_error, variables) => {
      trackEvent('Skills: install failed', {
        skill_name: variables.body.name,
        scope: variables.body.scope,
      })
    },
  })
}
