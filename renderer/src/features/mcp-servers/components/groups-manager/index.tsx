import type { ReactElement } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { AddGroupButton } from './add-group-button'
import { GroupList } from './group-list'
import { useGroups } from '../../hooks/use-groups'
import { Group } from './group'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../../utils/feature-flags'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'

interface GroupsManagerProps {
  currentGroupName?: string
}

export function GroupsManager({
  currentGroupName = '',
}: GroupsManagerProps): ReactElement {
  const location = useLocation()

  const isOptimizerActive = location.pathname === '/mcp-optimizer'
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)

  const { data } = useGroups()

  const apiGroups =
    data?.groups?.filter((group) => group.name !== MCP_OPTIMIZER_GROUP_NAME) ??
    []

  return (
    <div className="flex flex-col gap-2">
      {isMetaOptimizerEnabled ? (
        <Link to="/mcp-optimizer" preload="intent">
          <Group
            name="MCP Optimizer"
            isActive={isOptimizerActive}
            icon={Sparkles}
          />
        </Link>
      ) : null}
      <GroupList apiGroups={apiGroups} currentGroupName={currentGroupName} />
      <AddGroupButton apiGroups={apiGroups} />
    </div>
  )
}
