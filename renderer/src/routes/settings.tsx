import { createFileRoute } from '@tanstack/react-router'
import SettingsRouteComponent from './settings.route'

interface SettingsSearch {
  tab?: 'general' | 'registry' | 'version' | 'logs'
}

export const Route = createFileRoute('/settings')({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => ({
    tab:
      search.tab === 'general' ||
      search.tab === 'registry' ||
      search.tab === 'version' ||
      search.tab === 'logs'
        ? search.tab
        : undefined,
  }),
  component: SettingsRouteComponent,
})
