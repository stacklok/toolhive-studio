import type { ReactElement } from 'react'
import { GroupsManager } from './groups-manager'

interface McpServersSidebarProps {
  currentGroupName?: string
}

export function McpServersSidebar({
  currentGroupName,
}: McpServersSidebarProps): ReactElement {
  return (
    <aside
      className="border-input text-sidebar-foreground w-sidebar fixed top-16
        bottom-0 left-0 z-0 flex h-full flex-col items-start gap-3 border-r px-4
        pt-4 pb-4"
    >
      <div className="flex flex-col gap-3">
        <GroupsManager currentGroupName={currentGroupName} />
      </div>
    </aside>
  )
}
