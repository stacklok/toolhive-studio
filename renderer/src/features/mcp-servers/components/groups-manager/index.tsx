import type { ReactElement } from 'react'
import { AddGroupButton } from './add-group-button'
import { GroupList } from './group-list'
import { useGroups } from '../../hooks/use-groups'

interface GroupsManagerProps {
  currentGroupName?: string
}

export function GroupsManager({
  currentGroupName = '',
}: GroupsManagerProps): ReactElement {
  const { data } = useGroups()

  const apiGroups = data?.groups ?? []

  return (
    <div className="flex flex-col gap-2">
      <GroupList apiGroups={apiGroups} currentGroupName={currentGroupName} />
      <AddGroupButton apiGroups={apiGroups} />
    </div>
  )
}
