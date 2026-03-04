import { createFileRoute } from '@tanstack/react-router'
import SettingsRouteComponent from './-settings.route'
import { getApiV1BetaSecretsDefaultKeysOptions } from '@common/api/generated/@tanstack/react-query.gen'

interface SettingsSearch {
  tab?: 'general' | 'registry' | 'secrets' | 'cli' | 'version' | 'logs'
}

export const Route = createFileRoute('/settings')({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => ({
    tab:
      search.tab === 'general' ||
      search.tab === 'registry' ||
      search.tab === 'secrets' ||
      search.tab === 'cli' ||
      search.tab === 'version' ||
      search.tab === 'logs'
        ? search.tab
        : undefined,
  }),
  loader: async ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getApiV1BetaSecretsDefaultKeysOptions()),
  component: SettingsRouteComponent,
})
