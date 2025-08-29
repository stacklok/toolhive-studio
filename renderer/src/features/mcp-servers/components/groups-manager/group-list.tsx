import { Link } from '@tanstack/react-router'
import { Group } from './group'

interface GroupListProps {
  apiGroups: Array<{ name?: string; registered_clients?: string[] }>
  currentGroupName: string
}

export function GroupList({ apiGroups, currentGroupName }: GroupListProps) {
  return (
    <div className="space-y-2">
      {apiGroups.map((group) => (
        <Link
          key={group.name}
          to="/group/$groupName"
          params={{ groupName: group.name ?? '' }}
          preload="intent"
        >
          <Group
            name={group.name ?? ''}
            isEnabled={Boolean(
              group.registered_clients && group.registered_clients.length > 0
            )}
            isActive={(group.name ?? '') === currentGroupName}
          />
        </Link>
      ))}
    </div>
  )
}
