import { createFileRoute, useParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getApiV1BetaRegistryByNameOptions } from '@api/@tanstack/react-query.gen'
import { Badge } from '@/common/components/ui/badge'
import { Button } from '@/common/components/ui/button'
import { RegistryDetailHeader } from '@/features/registry-servers/components/registry-detail-header'
import { Separator } from '@/common/components/ui/separator'
import { Wrench } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/common/components/ui/table'

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
        description={group?.description ?? undefined}
      />
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
                <TableCell className="text-foreground">{srv.name}</TableCell>
                <TableCell>{srv.description}</TableCell>
              </TableRow>
            ))}
            {Object.entries(group?.remote_servers ?? {}).map(([key, srv]) => (
              <TableRow key={`remote-${key}`}>
                <TableCell className="text-foreground">{srv.name}</TableCell>
                <TableCell>{srv.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Separator className="my-6" />
      <div className="flex gap-5">
        <Button variant="default">
          <Wrench className="size-4" />
          Create group
        </Button>
      </div>
    </div>
  )
}
