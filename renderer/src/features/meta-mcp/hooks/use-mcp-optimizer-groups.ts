import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import type { GroupsGroup } from '@api/types.gen'
import { useRawGroups } from '@/features/mcp-servers/hooks/use-groups'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'

export type GroupWithServers = GroupsGroup & {
  servers: string[]
}

export function useMcpOptimizerGroups() {
  const { data: groupsData } = useRawGroups()
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

    return groups
      .filter((group) => group.name !== MCP_OPTIMIZER_GROUP_NAME)
      .map((group) => ({
        ...group,
        servers: serversByGroup[group.name ?? ''] ?? [],
      }))
  }, [groups, workloads])

  return groupsWithServers
}
