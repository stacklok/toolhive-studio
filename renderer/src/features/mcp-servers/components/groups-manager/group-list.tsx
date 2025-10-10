import { Link } from '@tanstack/react-router'
import { Group } from './group'
import { trackEvent } from '@/common/lib/analytics'

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

  return (
    <div className="space-y-2">
      {apiGroups.map((group) => (
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
