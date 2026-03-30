import { createFileRoute } from '@tanstack/react-router'
import { getApiV1BetaSkillsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { SkillsPage } from '@/features/skills/components/skills-page'

export const Route = createFileRoute('/skills')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getApiV1BetaSkillsOptions()),
  component: SkillsPage,
})
