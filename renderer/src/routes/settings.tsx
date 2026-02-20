import { createFileRoute } from '@tanstack/react-router'
import SettingsRouteComponent from './-settings.route'

const VALID_TABS = ['general', 'registry', 'version', 'logs', 'cli'] as const

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
  component: SettingsRouteComponent,
})
