import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import type { CoreWorkload } from '@api/types.gen'
import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/common/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { McpServerBadge } from './mcp-server-badge'

interface McpServerSelectorProps {
  enabledTools: string[]
  onEnabledToolsChange: (tools: string[]) => void
}

interface McpServer {
  id: string
  name: string
  status: 'running' | 'stopped'
  package?: string
}

export function McpServerSelector({
  enabledTools,
  onEnabledToolsChange,
}: McpServerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { data: workloadsData } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
    refetchInterval: 5000, // Refresh every 5 seconds to keep status updated
  })

  // Process workloads data to get running MCP servers
  const mcpServers: McpServer[] = (workloadsData?.workloads || [])
    .filter((w: CoreWorkload) => w.status === 'running' && w.url)
    .map((w: CoreWorkload) => ({
      id: `mcp_${w.name}`,
      name: w.name || 'Unknown',
      status: w.status as 'running' | 'stopped',
      package: w.package,
    }))

  const enabledMcpServers = mcpServers.filter((server) =>
    enabledTools.includes(server.id)
  )

  const handleToggleTool = async (toolId: string) => {
    // Extract server name from toolId (remove 'mcp_' prefix)
    const serverName = toolId.replace('mcp_', '')

    if (enabledTools.includes(toolId)) {
      // Disable all tools for this server
      try {
        await window.electronAPI.chat.saveEnabledMcpTools(serverName, [])
        // Refresh the enabled tools list from the single source of truth
        const newEnabledServers =
          await window.electronAPI.chat.getEnabledMcpServersFromTools()
        onEnabledToolsChange(newEnabledServers)
      } catch (error) {
        console.error('Failed to disable server tools:', error)
      }
    } else {
      // Enable all tools for this server by default
      try {
        // First get the server's available tools
        const serverTools =
          await window.electronAPI.chat.getMcpServerTools(serverName)

        if (serverTools?.tools && serverTools.tools.length > 0) {
          const allToolNames = serverTools.tools.map((tool) => tool.name)
          await window.electronAPI.chat.saveEnabledMcpTools(
            serverName,
            allToolNames
          )
          // Refresh the enabled tools list from the single source of truth
          const newEnabledServers =
            await window.electronAPI.chat.getEnabledMcpServersFromTools()

          onEnabledToolsChange(newEnabledServers)
        }
      } catch (error) {
        console.error('Failed to enable server tools:', error)
      }
    }
  }

  // Effect to sync server list with backend state when workloads change
  useEffect(() => {
    const syncServerList = async () => {
      try {
        const backendEnabledServers =
          await window.electronAPI.chat.getEnabledMcpServersFromTools()
        // If the current enabledTools doesn't match the backend, update it
        if (
          JSON.stringify(enabledTools.sort()) !==
          JSON.stringify(backendEnabledServers.sort())
        ) {
          onEnabledToolsChange(backendEnabledServers)
        }
      } catch (error) {
        console.error('Failed to sync server list with backend:', error)
      }
    }

    // Only sync if we have workload data
    if (workloadsData?.workloads) {
      syncServerList()
    }
  }, [workloadsData?.workloads, enabledTools, onEnabledToolsChange]) // Include dependencies

  const handleToolsChange = async () => {
    // Individual tool changes are already saved by the modal,
    // now refresh the server list from the single source of truth
    try {
      // Refresh the enabled servers list from individual tool states
      const newEnabledServers =
        await window.electronAPI.chat.getEnabledMcpServersFromTools()
      onEnabledToolsChange(newEnabledServers)
    } catch (error) {
      console.error('Failed to refresh enabled servers:', error)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header with dropdown */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm font-medium">
          MCP Server selected ({enabledMcpServers.length})
        </div>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center justify-between gap-2"
            >
              <span>MCP Servers</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="max-h-96 w-72 overflow-y-auto"
          >
            <DropdownMenuLabel>Available MCP Servers</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {mcpServers.length === 0 ? (
              <div className="text-muted-foreground p-2 text-sm">
                No MCP servers running
              </div>
            ) : (
              mcpServers.map((server) => (
                <DropdownMenuCheckboxItem
                  key={server.id}
                  checked={enabledTools.includes(server.id)}
                  onCheckedChange={() => handleToggleTool(server.id)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{server.name}</span>
                    {server.package && (
                      <span className="text-muted-foreground truncate text-xs">
                        {server.package}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-muted-foreground text-xs">
                      Running
                    </span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))
            )}

            {mcpServers.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onEnabledToolsChange([])}
                    disabled={enabledTools.length === 0}
                  >
                    Clear All
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Selected tools as badges */}
      {enabledMcpServers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {enabledMcpServers.map((server) => (
            <McpServerBadge
              key={server.id}
              serverName={server.name}
              onToolsChange={handleToolsChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
