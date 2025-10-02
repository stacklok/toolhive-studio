import type { ReactElement } from 'react'
import { useParams } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import { AddGroupButton } from './add-group-button'
import { GroupList } from './group-list'
import { useGroups } from '../../hooks/use-groups'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'

export function GroupsManager(): ReactElement {
  const params = useParams({ from: '/group/$groupName' })
  const currentGroupName = params.groupName

  const { data } = useGroups()

  const apiGroups = data?.groups ?? []

  // Fetch workloads for each group to determine enabled status
  const workloadQueries = useQueries({
    queries: apiGroups.map((group) => ({
      ...getApiV1BetaWorkloadsOptions({
        query: {
          all: true,
          group: group.name ?? '',
        },
      }),
    })),
  })

  // Map groups to their workloads
  const groupsWithWorkloads = apiGroups.map((group, index) => ({
    ...group,
    workloads: workloadQueries[index]?.data?.workloads ?? [],
  }))

  return (
    <div className="flex flex-col gap-2">
      <GroupList
        apiGroups={groupsWithWorkloads}
        currentGroupName={currentGroupName}
      />
      <AddGroupButton apiGroups={apiGroups} />
    </div>
  )
}
