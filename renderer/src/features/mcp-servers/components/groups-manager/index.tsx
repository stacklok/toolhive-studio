import type { ReactElement } from 'react'
import { Group } from './group'

type GroupData = {
  id: string
  name: string
  isEnabled: boolean
}

const MOCK_GROUPS: GroupData[] = [
  { id: 'group-1', name: 'Default group', isEnabled: true },
  { id: 'group-2', name: 'Research team', isEnabled: true },
  { id: 'group-3', name: 'Archive', isEnabled: false },
]

export function GroupsManager(): ReactElement {
  const DEFAULT_GROUP_NAME = 'Default group'
  const activeGroupId =
    MOCK_GROUPS.find((g) => g.name === DEFAULT_GROUP_NAME)?.id ||
    MOCK_GROUPS[0]?.id

  return (
    <div className="space-y-2">
      {MOCK_GROUPS.map((group) => (
        <Group
          key={group.id}
          name={group.name}
          isEnabled={group.isEnabled}
          isActive={group.id === activeGroupId}
        />
      ))}
    </div>
  )
}
