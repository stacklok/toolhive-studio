import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import type { RegistryGroup } from '@api/types.gen'
import { Button } from '@/common/components/ui/button'
import { Wrench } from 'lucide-react'
import { useGroups } from '@/features/mcp-servers/hooks/use-groups'
import { MultiServerInstallWizard } from './multi-server-install-wizard'

interface InstallGroupButtonProps {
  groupName: string
  group: RegistryGroup | undefined
}

export function InstallGroupButton({
  groupName,
  group,
}: InstallGroupButtonProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const { data: groupsData } = useGroups()
  const { data: workloadsData } = useQuery(
    getApiV1BetaWorkloadsOptions({ query: { all: true } })
  )

  // Compute install error message (if any)
  const installError = useMemo(() => {
    // Skip validation while wizard is open (group/servers are being created)
    if (isWizardOpen) {
      return null
    }

    // Pre-flight validation: check if group already exists
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

    // Pre-flight validation: check if any server names conflict with existing servers
    const existingWorkloads = workloadsData?.workloads ?? []

    // Get all server names from the registry group (both local and remote)
    const groupServerNames = [
      ...Object.keys(group?.servers ?? {}),
      ...Object.keys(group?.remote_servers ?? {}),
    ]

    // Find the first conflicting server (fail fast)
    const firstConflict = groupServerNames.find((serverName) =>
      existingWorkloads.some((w) => w.name === serverName)
    )

    if (firstConflict) {
      // Find which group this server belongs to
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
    isWizardOpen,
  ])

  return (
    <>
      <div className="flex flex-col gap-2">
        <div>
          <Button
            variant="default"
            onClick={() => setIsWizardOpen(true)}
            disabled={!!installError}
          >
            <Wrench className="size-4" />
            Install group
          </Button>
        </div>
        {installError && (
          <p className="text-destructive text-sm">{installError}</p>
        )}
      </div>
      <MultiServerInstallWizard
        group={group}
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </>
  )
}
