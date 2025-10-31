import { createFileRoute } from '@tanstack/react-router'
import { LogsPage } from '@/features/mcp-servers/sub-pages/logs-page'

interface LogsSearch {
  remote?: boolean
}

export const Route = createFileRoute('/logs/$groupName/$serverName')({
  validateSearch: (search: Record<string, unknown>): LogsSearch => ({
    remote: search.remote === true || search.remote === 'true',
  }),
  component: LogsPage,
})
