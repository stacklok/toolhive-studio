import { useAvailableServers } from '../hooks/use-available-servers'
import { McpServerBadge } from './mcp-server-badge'

export function McpServerSettings() {
  const { enabledMcpServers, handleToolsChange } = useAvailableServers()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
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
