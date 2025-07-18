import { TitlePage } from '@/common/components/title-page'
import { createFileRoute } from '@tanstack/react-router'
import { SettingsTabs } from '@/common/components/settings/tabs/settings-tabs'

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  if (typeof window === 'undefined' || !window.electronAPI) {
    return null
  }

  return (
    <>
      <TitlePage title="Settings" />
      <SettingsTabs />
    </>
  )
}
