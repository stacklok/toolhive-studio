import { Link } from '@tanstack/react-router'
import { Group } from './group'
import { trackEvent } from '@/common/lib/analytics'
import { useVisibleGroups } from '../../hooks/use-visible-groups'

interface GroupListProps {
  apiGroups: Array<{ name?: string; registered_clients?: string[] }>
  currentGroupName: string
}

export function GroupList({ apiGroups, currentGroupName }: GroupListProps) {
  const visibleGroups = useVisibleGroups(apiGroups)

  const handleGroupClick = (toGroupName: string) => {
    trackEvent('Group navigated', {
      from_is_default_group: String(currentGroupName === 'default'),
      to_is_default_group: String(toGroupName === 'default'),
    })
  }

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
