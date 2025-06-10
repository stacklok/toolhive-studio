import type { WorkloadsWorkload } from '@/common/api/generated'
import { getApiV1BetaWorkloadsByNameOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { Separator } from '@/common/components/ui/separator'
import { DetailMcpServer } from '@/features/mcp-servers/components/detail-mcp-server'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

export const Route = createFileRoute('/server/$serverName')({
  component: RouteComponent,
  loader: ({ context: { queryClient }, params: { serverName } }) =>
    queryClient.ensureQueryData(
      getApiV1BetaWorkloadsByNameOptions({
        path: { name: serverName },
      })
    ),
})

function RouteComponent() {
  const { serverName } = Route.useParams()
  const { data } = useSuspenseQuery(
    getApiV1BetaWorkloadsByNameOptions({
      path: { name: serverName },
    })
  )

  const serverData = JSON.parse(data as unknown as string) as WorkloadsWorkload
  const repo = serverData.package ?? ''
  const url = serverData.url ?? ''

  return (
    <>
      <Link
        to="/"
        className="text-muted-foreground mb-2 flex items-center gap-1"
      >
        <ChevronLeft size="16" />
        <span className="text-sm">Back</span>
      </Link>
      <div className="mb-6 flex items-center">
        <h1 className="text-3xl font-semibold">{serverData.name}</h1>
      </div>
      <Separator className="my-5" />

      {!serverData ? (
        <div>No MCP server found</div>
      ) : (
        <DetailMcpServer
          url={url}
          serverName={serverData.name ?? ''}
          repo={repo}
          status={serverData.status}
        />
      )}
    </>
  )
}
