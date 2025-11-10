import { createFileRoute, useParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getApiV1BetaRegistryByNameOptions } from '@api/@tanstack/react-query.gen'
import { Badge } from '@/common/components/ui/badge'
import { RegistryDetailHeader } from '@/features/registry-servers/components/registry-detail-header'
import { Separator } from '@/common/components/ui/separator'
import { Alert, AlertDescription } from '@/common/components/ui/alert'
import { Info } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/common/components/ui/table'
import { InstallGroupButton } from '@/features/registry-servers/components/install-group-button'

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
  const group = registryData?.registry?.groups?.find((g) => g.name === name)

  const hasServers =
    Object.keys(group?.servers ?? {}).length > 0 ||
    Object.keys(group?.remote_servers ?? {}).length > 0

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
          <InstallGroupButton groupName={name} group={group} />
        </>
      ) : (
        <Alert className="mt-6 max-w-2xl">
          <Info />
          <AlertDescription>
            This group does not have any servers.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
