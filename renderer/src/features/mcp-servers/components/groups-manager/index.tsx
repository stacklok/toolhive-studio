import type { ReactElement } from 'react'
import { useParams } from '@tanstack/react-router'
import { AddGroupButton } from './add-group-button'
import { GroupList } from './group-list'
import { useGroups } from '../../hooks/use-groups'

export function GroupsManager(): ReactElement {
  const params = useParams({ from: '/group/$groupName' })
  const currentGroupName = params.groupName

  const { data } = useGroups()

  const apiGroups = data?.groups ?? []

  return (
    <div className="flex flex-col gap-2">
      <GroupList apiGroups={apiGroups} currentGroupName={currentGroupName} />
      <AddGroupButton apiGroups={apiGroups} />
    </div>
  )
}
