import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import type { RegistryGroup } from '@api/types.gen'
import { useGroups } from '@/features/mcp-servers/hooks/use-groups'

interface UseGroupInstallValidationProps {
  groupName: string
  group: RegistryGroup | undefined
  skipValidation?: boolean
}

export function useGroupInstallValidation({
  groupName,
  group,
  skipValidation = false,
}: UseGroupInstallValidationProps) {
  const { data: groupsData } = useGroups()
  const { data: workloadsData } = useQuery(
    getApiV1BetaWorkloadsOptions({ query: { all: true } })
  )

  const error = useMemo(() => {
    if (skipValidation) {
      return null
    }

    const existingGroups = groupsData?.groups ?? []
    const groupExists = existingGroups.some((g) => g.name === groupName)

    if (groupExists) {
      return (
        <>
          A group named "{groupName}" already exists. Please{' '}
          <Link
            to="/group/$name"
            params={{ name: groupName }}
            className="underline"
          >
            delete it
          </Link>{' '}
          first or choose a different group.
        </>
      )
    }

    const existingWorkloads = workloadsData?.workloads ?? []

    const groupServerNames = [
      ...Object.keys(group?.servers ?? {}),
      ...Object.keys(group?.remote_servers ?? {}),
    ]

    const firstConflict = groupServerNames.find((serverName) =>
      existingWorkloads.some((w) => w.name === serverName)
    )

    if (firstConflict) {
      const conflictingWorkload = existingWorkloads.find(
        (w) => w.name === firstConflict
      )
      const groupNameConflict = conflictingWorkload?.group

      return (
        <>
          Server "{firstConflict}" already exists. Please{' '}
          {groupNameConflict ? (
            <Link
              to="/group/$name"
              params={{ name: groupNameConflict }}
              className="underline"
            >
              delete it
            </Link>
          ) : (
            <Link to="/groups" className="underline">
              delete it
            </Link>
          )}{' '}
          first or choose a different group.
        </>
      )
    }

    return null
  }, [
    groupsData?.groups,
    workloadsData?.workloads,
    groupName,
    group,
    skipValidation,
  ])

  return { error }
}
