import { createFileRoute } from '@tanstack/react-router'
import { getApiV1BetaWorkloadsByNameStatusOptions } from '@api/@tanstack/react-query.gen'
import { CustomizeToolsPage } from '@/features/mcp-servers/sub-pages/customize-tools/page'

export const Route = createFileRoute('/customize-tools/$serverName')({
  loader: async ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(
      getApiV1BetaWorkloadsByNameStatusOptions({
        path: { name: params.serverName },
      })
    ),
  component: CustomizeToolsPage,
})
