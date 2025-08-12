import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import type { WorkloadsWorkload } from '@api/types.gen'
import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/common/components/ui/dropdown-menu'
import { Badge } from '@/common/components/ui/badge'
import { ChevronDown, Wrench, Search, Code } from 'lucide-react'

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
    .filter((w: WorkloadsWorkload) => w.status === 'running' && w.url)
    .map((w: WorkloadsWorkload) => ({
      id: `mcp_${w.name}`,
      name: w.name || 'Unknown',
      status: w.status as 'running' | 'stopped',
      package: w.package,
    }))

  const getMcpIcon = (serverName: string) => {
    // You can customize icons based on server names
    switch (serverName.toLowerCase()) {
      case 'search':
        return <Search className="h-3 w-3" />
      case 'code':
      case 'interpreter':
        return <Code className="h-3 w-3" />
      default:
        return <Wrench className="h-3 w-3" />
    }
  }

  const handleToggleTool = (toolId: string) => {
    const newEnabledTools = enabledTools.includes(toolId)
      ? enabledTools.filter((id) => id !== toolId)
      : [...enabledTools, toolId]
    onEnabledToolsChange(newEnabledTools)
  }

  const enabledMcpServers = mcpServers.filter((server) =>
    enabledTools.includes(server.id)
  )

  return (
    <div className="flex items-center gap-2">
      {/* Show enabled servers as badges */}
      {enabledMcpServers.map((server) => (
        <Badge
          key={server.id}
          variant="secondary"
          className="hover:bg-muted-foreground/20 flex cursor-pointer
            items-center gap-1"
          onClick={() => handleToggleTool(server.id)}
        >
          {getMcpIcon(server.name)}
          {server.name}
        </Badge>
      ))}

      {/* MCP Servers dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Wrench className="h-4 w-4" />
            MCP Servers
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
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
                className="flex items-start gap-2"
              >
                <div className="flex flex-1 items-center gap-2">
                  {getMcpIcon(server.name)}
                  <div className="flex flex-col">
                    <span className="font-medium">{server.name}</span>
                    {server.package && (
                      <span className="text-muted-foreground text-xs">
                        {server.package}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground text-xs">Running</span>
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
  )
}
