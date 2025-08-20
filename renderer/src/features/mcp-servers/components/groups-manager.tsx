import type { ReactElement } from 'react'

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
    <pre className="text-xs whitespace-pre-wrap">
      {JSON.stringify(MOCK_GROUPS, null, 2)}
    </pre>
  )
}
