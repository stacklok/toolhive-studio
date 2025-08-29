import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'
import { useParams } from '@tanstack/react-router'
import { AddGroupButton } from './add-group-button'
import { GroupList } from './group-list'

export function GroupsManager(): ReactElement {
  const params = useParams({ from: '/group/$groupName' })
  const currentGroupName = params.groupName

  const { data } = useQuery({
    queryKey: ['api', 'v1beta', 'groups'],
    queryFn: async () => {
      const response = await getApiV1BetaGroups({
        parseAs: 'text',
        responseStyle: 'data',
      })
      const parsed =
        typeof response === 'string' ? JSON.parse(response) : response
      return parsed as {
        groups?: Array<{ name?: string; registered_clients?: string[] }>
      }
    },
    staleTime: 5_000,
  })

  const apiGroups = data?.groups ?? []

  return (
    <div className="flex flex-col gap-2">
      <GroupList apiGroups={apiGroups} currentGroupName={currentGroupName} />
      <AddGroupButton apiGroups={apiGroups} />
    </div>
  )
}
