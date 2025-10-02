import { Link } from '@tanstack/react-router'
import { Group } from './group'
import type { CoreWorkload } from '@api/types.gen'

interface GroupListProps {
  apiGroups: Array<{
    name?: string
    registered_clients?: string[]
    workloads?: CoreWorkload[]
  }>
  currentGroupName: string
}

export function GroupList({ apiGroups, currentGroupName }: GroupListProps) {
  return (
    <div className="space-y-2">
      {apiGroups.map((group) => {
        const runningWorkloads = (group.workloads ?? []).filter(
          (workload) => workload.status === 'running'
        )
        const isEnabled = runningWorkloads.length > 0

        return (
          <Link
            key={group.name}
            to="/group/$groupName"
            params={{ groupName: group.name ?? '' }}
            preload="intent"
          >
            <Group
              name={group.name ?? ''}
              isEnabled={isEnabled}
              isActive={(group.name ?? '') === currentGroupName}
            />
          </Link>
        )
      })}
    </div>
  )
}
