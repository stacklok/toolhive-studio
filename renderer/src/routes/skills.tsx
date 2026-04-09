import { createFileRoute } from '@tanstack/react-router'
import {
  getApiV1BetaSkillsOptions,
  getApiV1BetaSkillsBuildsOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import { SkillsPage } from '@/features/skills/components/skills-page'

export const Route = createFileRoute('/skills')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(getApiV1BetaSkillsOptions()),
      queryClient.ensureQueryData(getApiV1BetaSkillsBuildsOptions()),
    ]),
  component: SkillsPage,
})
