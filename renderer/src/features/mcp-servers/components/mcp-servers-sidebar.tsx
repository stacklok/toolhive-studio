import type { ReactElement } from 'react'
import { GroupsManager } from './groups-manager'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../utils/feature-flags'

export function McpServersSidebar(): ReactElement {
  const isGroupsEnabled = useFeatureFlag(featureFlagKeys.GROUPS)
  return (
    <aside
      className="bg-sidebar text-sidebar-foreground h-full w-64 shrink-0 border
        p-4"
    >
      <div className="space-y-4">
        <div>Hello World</div>
        {isGroupsEnabled ? <GroupsManager /> : null}
      </div>
    </aside>
  )
}
