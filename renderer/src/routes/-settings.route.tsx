import { useSearch } from '@tanstack/react-router'
import { SettingsTabs } from '@/common/components/settings/tabs/settings-tabs'
import { Route } from './settings'

export default function SettingsRouteComponent() {
  const { tab } = useSearch({ from: Route.id })

  return <SettingsTabs defaultTab={tab} />
}
