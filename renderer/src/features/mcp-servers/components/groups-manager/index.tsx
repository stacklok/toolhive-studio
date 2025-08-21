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
  return (
    <div className="space-y-2">
      {MOCK_GROUPS.map((group) => (
        <Group key={group.id} name={group.name} isEnabled={group.isEnabled} />
      ))}
    </div>
  )
}
