import { TitlePage } from '@/common/components/title-page'
import { useSearch } from '@tanstack/react-router'
import { SettingsTabs } from '@/common/components/settings/tabs/settings-tabs'
import { Route } from './settings'

export default function SettingsRouteComponent() {
  const { tab } = useSearch({ from: Route.id })

  if (typeof window === 'undefined' || !window.electronAPI) {
    return null
  }

  return (
    <>
      <TitlePage title="Settings" />
      <SettingsTabs defaultTab={tab} />
    </>
  )
}
