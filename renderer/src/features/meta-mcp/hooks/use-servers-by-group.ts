import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'

export function useServersByGroup() {
  const { data: workloadsData } = useQuery({
    ...getApiV1BetaWorkloadsOptions({
      query: {
        all: true,
      },
    }),
  })

  const workloads = workloadsData?.workloads ?? []

  const serversByGroup = useMemo(() => {
    const grouped: Record<string, string[]> = {}
    workloads.forEach((workload) => {
      const groupName = workload.group ?? 'default'
      if (!grouped[groupName]) {
        grouped[groupName] = []
      }
      if (workload.name) {
        grouped[groupName].push(workload.name)
      }
    })
    return grouped
  }, [workloads])

  return serversByGroup
}
