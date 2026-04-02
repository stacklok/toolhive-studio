import type { ReactElement } from 'react'
import { GroupsManager } from './groups-manager'
import { useMcpOptimizerBannerVisible } from '@/common/hooks/use-mcp-optimizer-banner-visible'

interface McpServersSidebarProps {
  currentGroupName?: string
}

export function McpServersSidebar({
  currentGroupName,
}: McpServersSidebarProps): ReactElement {
  const isBannerVisible = useMcpOptimizerBannerVisible()
  const sidebarTop = isBannerVisible ? `7rem` : '4rem'

  return (
    <aside
      className="border-input text-sidebar-foreground w-sidebar fixed bottom-0
        left-0 z-0 flex h-full flex-col items-start gap-3 border-r px-4 pt-4
        pb-4"
      style={{ top: sidebarTop }}
    >
      <div className="flex flex-col gap-3">
        <GroupsManager currentGroupName={currentGroupName} />
      </div>
    </aside>
  )
}
