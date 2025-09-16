import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import type { CoreWorkload } from '@api/types.gen'
import { toast } from 'sonner'
import log from 'electron-log/renderer'
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
import type { ChatMcpServer } from '../types'
import { Badge } from '@/common/components/ui/badge'
import { ScrollArea } from '@/common/components/ui/scroll-area'

export function McpServerSelector() {
  const [isOpen, setIsOpen] = useState(false)
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
    .sort((a, b) => a.name.localeCompare(b.name))

  const enabledMcpServers = mcpServers.filter((server) =>
    backendEnabledTools.includes(server.id)
  )

  const handleToggleTool = async (serverId: string) => {
    // Extract server name from serverId (remove 'mcp_' prefix)
    const serverName = serverId.replace('mcp_', '')

    if (backendEnabledTools.includes(serverId)) {
      // Disable all tools for this server
      try {
        await window.electronAPI.chat.saveEnabledMcpTools(serverName, [])
        // Invalidate query to refetch latest state
        queryClient.invalidateQueries({
          queryKey: ['chat', 'enabledMcpServers'],
        })
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
          // Invalidate query to refetch latest state
          queryClient.invalidateQueries({
            queryKey: ['chat', 'enabledMcpServers'],
          })
        }
      } catch (error) {
        log.error('Failed to enable server tools:', error)
        toast.error(`Failed to detect tools for ${serverName}`)
      }
    }
  }

  const handleClearEnabledServers = async () => {
    try {
      await Promise.allSettled(
        backendEnabledTools.map((serverId) => {
          const serverName = serverId.replace('mcp_', '')
          if (backendEnabledTools.includes(serverId)) {
            return window.electronAPI.chat.saveEnabledMcpTools(serverName, [])
          }
          return Promise.resolve()
        })
      )
      queryClient.invalidateQueries({
        queryKey: ['chat', 'enabledMcpServers'],
      })
    } catch (error) {
      log.error('Failed to clear enabled servers:', error)
      toast.error('Failed to clear enabled servers')
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex h-10 items-center justify-between gap-2"
        >
          <span>MCP Servers</span>
          <Badge variant="secondary">{enabledMcpServers.length} Enabled</Badge>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="max-h-96 w-72">
        <DropdownMenuLabel>Available MCP Servers</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea>
          {mcpServers.length === 0 ? (
            <div className="text-muted-foreground p-2 text-sm">
              No MCP servers running
            </div>
          ) : (
            mcpServers.map((server) => (
              <DropdownMenuCheckboxItem
                key={server.id}
                checked={backendEnabledTools.includes(server.id)}
                onCheckedChange={() => handleToggleTool(server.id)}
                className="flex cursor-pointer items-center gap-3 py-2"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{server.name}</span>
                </div>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </ScrollArea>

        {mcpServers.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer text-xs"
                onClick={handleClearEnabledServers}
                disabled={backendEnabledTools.length === 0}
              >
                Clear enabled servers
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
