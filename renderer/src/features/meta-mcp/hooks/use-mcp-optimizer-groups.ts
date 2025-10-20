import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import type { GroupsGroup } from '@api/types.gen'
import { useGroups } from '@/features/mcp-servers/hooks/use-groups'

export type GroupWithServers = GroupsGroup & {
  servers: string[]
}

export function useMcpOptimizerGroups() {
  const { data: groupsData } = useGroups()
  const { data: workloadsData } = useQuery({
    ...getApiV1BetaWorkloadsOptions({
      query: {
        all: true,
      },
    }),
  })

  const groups = groupsData?.groups ?? []
  const workloads = workloadsData?.workloads ?? []

  const groupsWithServers = useMemo(() => {
    const serversByGroup: Record<string, string[]> = {}

    workloads.forEach((workload) => {
      const groupName = workload.group ?? 'default'
      if (!serversByGroup[groupName]) {
        serversByGroup[groupName] = []
      }
      if (workload.name) {
        serversByGroup[groupName].push(workload.name)
      }
    })

    return groups.map((group) => ({
      ...group,
      servers: serversByGroup[group.name ?? ''] ?? [],
    }))
  }, [groups, workloads])

  return groupsWithServers
}
