import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { ChevronDown, Loader2, Settings2 } from 'lucide-react'
import { Badge } from '@/common/components/ui/badge'
import { ScrollArea } from '@/common/components/ui/scroll-area'
import { useAvailableServers } from '../hooks/use-available-servers'
import { getNormalizedServerName } from '../lib/utils'
import { McpToolsModal } from './mcp-tools-modal'
import { cn } from '@/common/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'

export function McpServerSelector() {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [serverNameSelected, setServerNameSelected] = useState<string | null>(
    null
  )
  const [serverToggling, setServerToggling] = useState<string | null>(null)
  const { allAvailableMcpServer, enabledMcpServers, backendEnabledTools } =
    useAvailableServers()

  const { data: enabledMcpTools } = useQuery({
    queryKey: ['enabled-mcp-tools'],
    queryFn: async () => await window.electronAPI.chat.getEnabledMcpTools(),
    refetchInterval: 5000, // Refresh every 5 seconds
    refetchOnMount: true,
  })

  const handleToggleTool = async (serverName: string) => {
    if (backendEnabledTools.includes(serverName)) {
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
      setServerToggling(serverName)
      // Enable all tools for this server by default
      try {
        // First get the server's available tools
        const serverTools =
          await window.electronAPI.chat.getMcpServerTools(serverName)
        if (serverTools?.tools && serverTools.tools.length > 0) {
          const allToolNames = serverTools.tools.map((tool) => tool.name)
          const response = await window.electronAPI.chat.saveEnabledMcpTools(
            serverName,
            allToolNames
          )
          if (response.success) {
            // Invalidate query to refetch latest state
            queryClient.invalidateQueries({
              queryKey: ['chat', 'enabledMcpServers'],
            })
            queryClient.invalidateQueries({
              queryKey: ['enabled-mcp-tools'],
            })
          } else {
            toast.error(`Failed to enable server tools for ${serverName}`)
          }
        }
      } catch (error) {
        log.error('Failed to enable server tools:', error)
        toast.error(`Failed to detect tools for ${serverName}`)
      }
    }
    setServerToggling(null)
  }

  const handleClearEnabledServers = async () => {
    try {
      await Promise.allSettled(
        backendEnabledTools.map((serverName) => {
          if (backendEnabledTools.includes(serverName)) {
            return window.electronAPI.chat.saveEnabledMcpTools(serverName, [])
          }
          return Promise.resolve()
        })
      )
      queryClient.invalidateQueries({
        queryKey: ['chat', 'enabledMcpServers'],
      })
      queryClient.invalidateQueries({
        queryKey: ['enabled-mcp-tools'],
      })
    } catch (error) {
      log.error('Failed to clear enabled servers:', error)
      toast.error('Failed to clear enabled servers')
    }
  }
  const getTotalToolsCount = () => {
    if (!enabledMcpTools) return 0
    return Object.values(enabledMcpTools).flat().length
  }

  const getServerEnabledToolsCount = (serverName: string): number => {
    if (!enabledMcpTools) return 0
    const serverToolsList = enabledMcpTools[serverName] || []
    return serverToolsList.length
  }

  const handleToolsChange = () => {
    queryClient.invalidateQueries({
      queryKey: ['chat', 'enabledMcpServers'],
    })
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex h-10 items-center justify-between gap-2"
          >
            <span>MCP Servers</span>
            <Badge variant="secondary">
              {enabledMcpServers.length} Enabled / {getTotalToolsCount()} Tools
            </Badge>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="max-h-96 w-72">
          <DropdownMenuLabel>Available MCP Servers</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea>
            {allAvailableMcpServer.length === 0 ? (
              <div className="text-muted-foreground p-2 text-sm">
                No MCP servers running
              </div>
            ) : (
              allAvailableMcpServer.map((server) => (
                <DropdownMenuCheckboxItem
                  key={server.id}
                  checked={backendEnabledTools.includes(server.name)}
                  onCheckedChange={() => handleToggleTool(server.name)}
                  onSelect={(event) => event.preventDefault()}
                  className={cn('flex cursor-pointer items-center gap-3 py-1')}
                  disabled={serverToggling === server.name}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="max-w-30 truncate font-normal">
                          {getNormalizedServerName(server.name)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {getNormalizedServerName(server.name)}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {backendEnabledTools.includes(server.name) && (
                    <div>
                      <Badge
                        variant="outline"
                        className="bg-background/90 min-w-2 font-light"
                      >
                        {getServerEnabledToolsCount(server.name) === 0 ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          `${getServerEnabledToolsCount(server.name)} tools`
                        )}
                      </Badge>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation()
                      setModalOpen(true)
                      setServerNameSelected(server.name)
                    }}
                  >
                    <Settings2 className="size-4" />
                  </Button>
                </DropdownMenuCheckboxItem>
              ))
            )}
          </ScrollArea>

          {allAvailableMcpServer.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full cursor-pointer font-light"
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

      <McpToolsModal
        open={!!serverNameSelected && modalOpen}
        onOpenChange={setModalOpen}
        serverName={serverNameSelected ?? ''}
        onToolsChange={handleToolsChange}
      />
    </>
  )
}
