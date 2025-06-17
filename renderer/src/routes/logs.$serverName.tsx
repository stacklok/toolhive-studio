import { createFileRoute } from '@tanstack/react-router'
import { LogsPage } from '@/features/mcp-servers/sub-pages/logs-page'

export const Route = createFileRoute('/logs/$serverName')({
  component: LogsPage,
})
