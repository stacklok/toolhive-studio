import type { ReactElement } from 'react'
import { Link, useLocation, useMatches } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { AddGroupButton } from './add-group-button'
import { GroupList } from './group-list'
import { useGroups } from '../../hooks/use-groups'
import { Group } from './group'
import { trackEvent } from '@/common/lib/analytics'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../../utils/feature-flags'

export function GroupsManager(): ReactElement {
  const location = useLocation()
  const matches = useMatches()

  // Find the group route match and extract groupName if it exists
  const groupMatch = matches.find(
    (match) => match.routeId === '/group/$groupName'
  )
  const currentGroupName = groupMatch?.params?.groupName ?? ''

  const isOptimizerActive = location.pathname === '/mcp-optimizer'
  const isMetaMcpEnabled = useFeatureFlag(featureFlagKeys.META_MCP)

  const { data } = useGroups()

  const apiGroups = data?.groups ?? []

  const handleOptimizerClick = () => {
    trackEvent('MCP Optimizer navigated', {})
  }

  return (
    <div className="flex flex-col gap-2">
      {isMetaMcpEnabled ? (
        <Link
          to="/mcp-optimizer"
          preload="intent"
          onClick={handleOptimizerClick}
        >
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
