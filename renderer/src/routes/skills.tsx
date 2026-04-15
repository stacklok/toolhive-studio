import { createFileRoute } from '@tanstack/react-router'
import {
  getApiV1BetaSkillsOptions,
  getApiV1BetaSkillsBuildsOptions,
  getRegistryByRegistryNameV01xDevToolhiveSkillsOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import { SkillsPage } from '@/features/skills/components/skills-page'

const VALID_TABS = ['registry', 'installed', 'builds'] as const
type SkillsTab = (typeof VALID_TABS)[number]

export const Route = createFileRoute('/skills')({
  validateSearch: (search: Record<string, unknown>): { tab: SkillsTab } => ({
    tab: VALID_TABS.includes(search.tab as SkillsTab)
      ? (search.tab as SkillsTab)
      : 'installed',
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(getApiV1BetaSkillsOptions()),
      queryClient.ensureQueryData(getApiV1BetaSkillsBuildsOptions()),
      queryClient.ensureQueryData(
        getRegistryByRegistryNameV01xDevToolhiveSkillsOptions({
          path: { registryName: 'default' },
        })
      ),
    ]),
  component: SkillsPage,
})
