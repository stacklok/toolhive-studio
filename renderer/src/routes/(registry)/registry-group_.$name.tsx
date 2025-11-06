import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { useSuspenseQuery, useQuery } from '@tanstack/react-query'
import {
  getApiV1BetaRegistryByNameOptions,
  getApiV1BetaWorkloadsOptions,
} from '@api/@tanstack/react-query.gen'
import { Badge } from '@/common/components/ui/badge'
import { Button } from '@/common/components/ui/button'
import { RegistryDetailHeader } from '@/features/registry-servers/components/registry-detail-header'
import { Separator } from '@/common/components/ui/separator'
import { Alert, AlertDescription } from '@/common/components/ui/alert'
import { Wrench, Info } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/common/components/ui/table'
import { MultiServerInstallWizard } from '@/features/registry-servers/components/multi-server-install-wizard'
import { useState, useMemo } from 'react'
import { useGroups } from '@/features/mcp-servers/hooks/use-groups'

export const Route = createFileRoute('/(registry)/registry-group_/$name')({
  loader: async ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameOptions({ path: { name: 'default' } })
    )
  },
  component: RegistryGroupDetail,
})

export function RegistryGroupDetail() {
  const { name } = useParams({ from: '/(registry)/registry-group_/$name' })
  const { data: registryData } = useSuspenseQuery(
    getApiV1BetaRegistryByNameOptions({ path: { name: 'default' } })
  )
  const { data: groupsData } = useGroups()
  const { data: workloadsData } = useQuery(
    getApiV1BetaWorkloadsOptions({ query: { all: true } })
  )
  const group = registryData?.registry?.groups?.find((g) => g.name === name)
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  const hasServers =
    Object.keys(group?.servers ?? {}).length > 0 ||
    Object.keys(group?.remote_servers ?? {}).length > 0

  // Compute install error message (if any)
  const installError = useMemo(() => {
    // Skip validation while wizard is open (group/servers are being created)
    if (isWizardOpen) {
      return null
    }

    // Pre-flight validation: check if group already exists
    const existingGroups = groupsData?.groups ?? []
    const groupExists = existingGroups.some((g) => g.name === name)

    if (groupExists) {
      return (
        <>
          A group named "{name}" already exists. Please{' '}
          <Link to="/group/$name" params={{ name }} className="underline">
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
      const groupName = conflictingWorkload?.group

      return (
        <>
          Server "{firstConflict}" already exists. Please{' '}
          {groupName ? (
            <Link
              to="/group/$name"
              params={{ name: groupName }}
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
  }, [groupsData?.groups, workloadsData?.workloads, name, group, isWizardOpen])

  return (
    <div className="flex max-h-full w-full flex-1 flex-col">
      <RegistryDetailHeader
        title={name}
        badges={
          <Badge
            variant="secondary"
            className="bg-foreground/5 w-fit rounded-full px-2.5 py-0.5"
          >
            Group
          </Badge>
        }
        description={group?.description}
      />
      {hasServers ? (
        <>
          <div className="mt-6 overflow-hidden rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-muted-foreground text-xs">
                    Server
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs">
                    Description
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(group?.servers ?? {}).map(([key, srv]) => (
                  <TableRow key={`local-${key}`}>
                    <TableCell className="text-foreground">
                      {srv.name}
                    </TableCell>
                    <TableCell>{srv.description}</TableCell>
                  </TableRow>
                ))}
                {Object.entries(group?.remote_servers ?? {}).map(
                  ([key, srv]) => (
                    <TableRow key={`remote-${key}`}>
                      <TableCell className="text-foreground">
                        {srv.name}
                      </TableCell>
                      <TableCell>{srv.description}</TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
          <Separator className="my-6" />
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
        </>
      ) : (
        <Alert className="mt-6 max-w-2xl">
          <Info />
          <AlertDescription>
            This group does not have any servers.
          </AlertDescription>
        </Alert>
      )}
      <MultiServerInstallWizard
        group={group}
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </div>
  )
}
