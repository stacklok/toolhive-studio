import { createFileRoute } from '@tanstack/react-router'
import { LogsPage } from '@/features/mcp-servers/sub-pages/logs-page'
import { getApiV1BetaWorkloadsByNameLogsOptions } from '@/common/api/generated/@tanstack/react-query.gen'

export const Route = createFileRoute('/logs/$serverName')({
  loader: async ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(
      getApiV1BetaWorkloadsByNameLogsOptions({
        path: { name: params.serverName },
      })
    ),
  component: LogsPage,
})
