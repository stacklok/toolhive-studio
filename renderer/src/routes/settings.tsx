import { createFileRoute } from '@tanstack/react-router'
import SettingsRouteComponent from './-settings.route'
import { getApiV1BetaSecretsDefaultKeysOptions } from '@common/api/generated/@tanstack/react-query.gen'

const VALID_TABS = [
  'general',
  'registry',
  'secrets',
  'version',
  'logs',
  'cli',
] as const

type SettingsTab = (typeof VALID_TABS)[number]

interface SettingsSearch {
  tab?: SettingsTab
}

function isValidTab(value: unknown): value is SettingsTab {
  return VALID_TABS.includes(value as SettingsTab)
}

export const Route = createFileRoute('/settings')({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => ({
    tab: isValidTab(search.tab) ? search.tab : undefined,
  }),
  loader: ({ context: { queryClient } }) =>
    // prefetchQuery (not ensureQueryData) so a secrets API failure doesn't
    // break the entire Settings route when the user is on a different tab.
    queryClient.prefetchQuery(getApiV1BetaSecretsDefaultKeysOptions()),
  component: SettingsRouteComponent,
})
