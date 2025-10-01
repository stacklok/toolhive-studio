import { useAvailableServers } from '../hooks/use-available-servers'
import { McpServerBadge } from './mcp-server-badge'
// TODO: we are not using this at the moment, but better keep it here for now
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
