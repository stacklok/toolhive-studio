import { Link } from '@tanstack/react-router'
import { Group } from './group'
import { trackEvent } from '@/common/lib/analytics'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'

interface GroupListProps {
  apiGroups: Array<{ name?: string; registered_clients?: string[] }>
  currentGroupName: string
}

export function GroupList({ apiGroups, currentGroupName }: GroupListProps) {
  const handleGroupClick = (toGroupName: string) => {
    trackEvent('Group navigated', {
      from_is_default_group: String(currentGroupName === 'default'),
      to_is_default_group: String(toGroupName === 'default'),
    })
  }

  const visibleGroups = apiGroups.filter(
    (group) => group.name !== MCP_OPTIMIZER_GROUP_NAME
  )

  return (
    <div className="space-y-2">
      {visibleGroups.map((group) => (
        <Link
          key={group.name}
          to="/group/$groupName"
          params={{ groupName: group.name ?? '' }}
          preload="intent"
          onClick={() => handleGroupClick(group.name ?? '')}
        >
          <Group
            name={group.name ?? ''}
            isActive={(group.name ?? '') === currentGroupName}
          />
        </Link>
      ))}
    </div>
  )
}
