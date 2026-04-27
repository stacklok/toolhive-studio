import { createFileRoute } from '@tanstack/react-router'
import {
  getApiV1BetaSkillsOptions,
  getApiV1BetaSkillsBuildsOptions,
  getRegistryByRegistryNameV01xDevToolhiveSkillsOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import { SkillsPage } from '@/features/skills/components/skills-page'
import {
  DEFAULT_REGISTRY_PAGE_SIZE,
  REGISTRY_PAGE_SIZE_OPTIONS,
} from '@/features/skills/lib/registry-pagination'

const VALID_TABS = ['registry', 'installed', 'builds'] as const
type SkillsTab = (typeof VALID_TABS)[number]

export type SkillsSearch = {
  tab: SkillsTab
  page: number
  limit: number | undefined
}

export const Route = createFileRoute('/skills')({
  validateSearch: (search: Record<string, unknown>): SkillsSearch => {
    const tab = VALID_TABS.includes(search.tab as SkillsTab)
      ? (search.tab as SkillsTab)
      : 'installed'

    const pageNum = Number(search.page)
    const page =
      Number.isFinite(pageNum) && pageNum >= 1 ? Math.floor(pageNum) : 1

    const limitNum = Number(search.limit)
    const limit = (REGISTRY_PAGE_SIZE_OPTIONS as readonly number[]).includes(
      limitNum
    )
      ? limitNum
      : undefined

    return { tab, page, limit }
  },
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  loader: ({ context: { queryClient }, deps: { page, limit } }) =>
    Promise.all([
      queryClient.ensureQueryData(getApiV1BetaSkillsOptions()),
      queryClient.ensureQueryData(getApiV1BetaSkillsBuildsOptions()),
      queryClient.ensureQueryData(
        getRegistryByRegistryNameV01xDevToolhiveSkillsOptions({
          path: { registryName: 'default' },
          query: { page, limit: limit ?? DEFAULT_REGISTRY_PAGE_SIZE },
        })
      ),
    ]),
  component: SkillsPage,
})
