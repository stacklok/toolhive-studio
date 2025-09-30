import { createFileRoute } from '@tanstack/react-router'
import { LogsPage } from '@/features/mcp-servers/sub-pages/logs-page'
import { getApiV1BetaWorkloadsByNameLogsOptions } from '@api/@tanstack/react-query.gen'

export const Route = createFileRoute('/logs/$groupName/$serverName')({
  loader: async ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(
      getApiV1BetaWorkloadsByNameLogsOptions({
        path: { name: params.serverName },
      })
    ),
  component: LogsPage,
})
