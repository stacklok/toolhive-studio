import type { ReactElement } from 'react'
import { GroupsManager } from './groups-manager'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../utils/feature-flags'

export function McpServersSidebar(): ReactElement {
  const isGroupsEnabled = useFeatureFlag(featureFlagKeys.GROUPS)
  return (
    <aside
      className="border-input bg-muted/50 text-sidebar-foreground flex h-full
        w-[247px] shrink-0 flex-col items-start gap-3 self-stretch border-r px-4
        pt-4 pb-0"
    >
      <div className="flex flex-col gap-3">
        <div>Hello World</div>
        {isGroupsEnabled ? <GroupsManager /> : null}
      </div>
    </aside>
  )
}
