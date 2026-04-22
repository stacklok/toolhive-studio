import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  postApiV1BetaSkillsMutation,
  getApiV1BetaSkillsQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import type { PkgApiV1InstallSkillRequest } from '@common/api/generated/types.gen'
import { toast } from 'sonner'
import { trackEvent } from '@/common/lib/analytics'

export function useMutationInstallSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    ...postApiV1BetaSkillsMutation(),
    onSuccess: (data, variables) => {
      const body = variables.body as PkgApiV1InstallSkillRequest
      const skillName =
        data?.skill?.metadata?.name ?? data?.skill?.reference ?? 'Skill'
      toast.success(`${skillName} installed successfully`)
      trackEvent('Skills: install succeeded', {
        skill_name: skillName,
        scope: body.scope ?? 'unknown',
        has_version: body.version ? 'true' : 'false',
        clients_count: body.clients?.length ?? 0,
      })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaSkillsQueryKey(),
      })
    },
    onError: (_error, variables) => {
      const body = variables.body as PkgApiV1InstallSkillRequest
      trackEvent('Skills: install failed', {
        skill_name: body.name ?? 'unknown',
        scope: body.scope ?? 'unknown',
      })
    },
  })
}
