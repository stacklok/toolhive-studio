import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import type { CoreWorkload } from '@api/types.gen'
import { McpServerBadge } from './mcp-server-badge'
import { ToolhiveMcpBadge } from './toolhive-mcp-badge'
import type { ChatMcpServer } from '../types'

export function McpServerSettings() {
  const queryClient = useQueryClient()

  const { data: workloadsData } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
    refetchInterval: 30000,
  })

  const { data: backendEnabledTools = [] } = useQuery({
    queryKey: ['chat', 'enabledMcpServers'],
    queryFn: () => window.electronAPI.chat.getEnabledMcpServersFromTools(),
    refetchInterval: 30000,
  })

  // Process workloads data to get running MCP servers
  const mcpServers: ChatMcpServer[] = (workloadsData?.workloads || [])
    .filter((w: CoreWorkload) => w.status === 'running' && w.url)
    .map((w: CoreWorkload) => ({
      id: `mcp_${w.name}`,
      name: w.name || 'Unknown',
      status: w.status as 'running' | 'stopped',
      package: w.package,
    }))

  const enabledMcpServers = mcpServers.filter((server) =>
    backendEnabledTools.includes(server.id)
  )

  const handleToolsChange = async () => {
    // Individual tool changes are already saved by the modal,
    // invalidate query to refetch latest state
    queryClient.invalidateQueries({ queryKey: ['chat', 'enabledMcpServers'] })
  }

  return (
    <div className="space-y-3">
      {/* Selected tools as badges */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Toolhive MCP Badge (always shows when available) */}
        <ToolhiveMcpBadge />

        {/* Regular MCP server badges */}
        {enabledMcpServers.map((server) => (
          <McpServerBadge
            key={server.id}
            serverName={server.name}
            onToolsChange={handleToolsChange}
          />
        ))}
      </div>
    </div>
  )
}
