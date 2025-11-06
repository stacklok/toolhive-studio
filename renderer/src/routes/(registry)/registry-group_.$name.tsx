import { createFileRoute, useParams } from '@tanstack/react-router'
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
import { Wrench, Info, AlertCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/common/components/ui/table'
import { MultiServerInstallWizard } from '@/features/registry-servers/components/multi-server-install-wizard'
import { useState } from 'react'
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
  const [error, setError] = useState<string | null>(null)

  const hasServers =
    Object.keys(group?.servers ?? {}).length > 0 ||
    Object.keys(group?.remote_servers ?? {}).length > 0

  const handleInstallClick = () => {
    // Pre-flight validation: check if group already exists
    const existingGroups = groupsData?.groups ?? []
    const groupExists = existingGroups.some((g) => g.name === name)

    if (groupExists) {
      setError(
        `A group named "${name}" already exists. Please delete it first or choose a different group.`
      )
      return
    }

    // Pre-flight validation: check if any server names conflict with existing servers
    const existingWorkloads = workloadsData?.workloads ?? []
    const existingServerNames = new Set(
      existingWorkloads.map((w) => w.name).filter(Boolean)
    )

    // Get all server names from the registry group (both local and remote)
    const groupServerNames = [
      ...Object.keys(group?.servers ?? {}),
      ...Object.keys(group?.remote_servers ?? {}),
    ]

    const conflictingServers = groupServerNames.filter((serverName) =>
      existingServerNames.has(serverName)
    )

    if (conflictingServers.length > 0) {
      const serverList = conflictingServers.join(', ')
      setError(
        `The following server${conflictingServers.length > 1 ? 's' : ''} already exist${conflictingServers.length === 1 ? 's' : ''}: ${serverList}. Please delete ${conflictingServers.length > 1 ? 'them' : 'it'} first or choose a different group.`
      )
      return
    }

    // Clear any previous errors and open wizard
    setError(null)
    setIsWizardOpen(true)
  }

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
          {error && (
            <Alert variant="destructive" className="mb-6 max-w-2xl">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-5">
            <Button variant="default" onClick={handleInstallClick}>
              <Wrench className="size-4" />
              Install group
            </Button>
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
