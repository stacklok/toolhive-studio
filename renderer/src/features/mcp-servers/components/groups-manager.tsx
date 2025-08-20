import type { ReactElement } from 'react'
import { Group } from './group'

type Group = {
  id: string
  name: string
  isActive: boolean
}

const MOCK_GROUPS: Group[] = [
  { id: 'group-1', name: 'Default group', isActive: true },
  { id: 'group-2', name: 'Research team', isActive: true },
  { id: 'group-3', name: 'Archive', isActive: false },
]

export function GroupsManager(): ReactElement {
  return (
    <div className="space-y-2">
      {MOCK_GROUPS.map((group) => (
        <Group key={group.id} name={group.name} isActive={group.isActive} />
      ))}
    </div>
  )
}
