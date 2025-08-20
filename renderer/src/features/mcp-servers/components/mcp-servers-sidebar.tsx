import type { ReactElement } from 'react'
import { GroupsManager } from './groups-manager'

export function McpServersSidebar(): ReactElement {
  return (
    <aside
      className="bg-sidebar text-sidebar-foreground h-full w-64 shrink-0 border
        p-4"
    >
      <div className="space-y-4">
        <div>Hello World</div>
        <GroupsManager />
      </div>
    </aside>
  )
}
