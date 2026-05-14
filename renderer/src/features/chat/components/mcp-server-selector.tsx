import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { ChevronDown, Loader2, ServerIcon, Settings2 } from 'lucide-react'
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
import { trackEvent } from '@/common/lib/analytics'

interface McpServerSelectorProps {
  threadId?: string | null
}

export function McpServerSelector({ threadId }: McpServerSelectorProps) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [serverNameSelected, setServerNameSelected] = useState<string | null>(
    null
  )
  const [serverToggling, setServerToggling] = useState<string | null>(null)
  const {
    allAvailableMcpServer,
    enabledMcpServers,
    backendEnabledTools,
    enabledMcpTools,
  } = useAvailableServers(threadId)

  const enabledMcpToolsQueryKey = threadId
    ? (['chat', 'thread', threadId, 'enabledMcpTools'] as const)
    : (['chat', 'enabled-mcp-tools'] as const)

  const saveServerTools = async (serverName: string, toolNames: string[]) => {
    if (threadId) {
      // Dual-write: per-thread row owns this thread's selection; global
      // write keeps "last used" so new threads inherit the latest pick.
      const perThread =
        await window.electronAPI.chat.threadSettings.setEnabledMcpTools(
          threadId,
          serverName,
          toolNames
        )
      try {
        await window.electronAPI.chat.saveEnabledMcpTools(serverName, toolNames)
      } catch (err) {
        log.warn('Failed to update global MCP tools default:', err)
      }
      return perThread
    }
    return window.electronAPI.chat.saveEnabledMcpTools(serverName, toolNames)
  }

  const invalidateEnabledTools = () => {
    queryClient.invalidateQueries({ queryKey: enabledMcpToolsQueryKey })
    if (threadId) {
      queryClient.invalidateQueries({
        queryKey: ['chat', 'enabled-mcp-tools'],
      })
    }
  }

  const handleToggleTool = async (serverName: string) => {
    if (backendEnabledTools.includes(serverName)) {
      trackEvent(`Playground: disable server ${serverName}`, {
        tools_count: enabledMcpTools?.[serverName]?.length,
      })
      // Disable all tools for this server
      try {
        await saveServerTools(serverName, [])
        invalidateEnabledTools()
      } catch (error) {
        console.error('Failed to disable server tools:', error)
      }
    } else {
      trackEvent(`Playground: enable server ${serverName}`, {
        tools_count: enabledMcpTools?.[serverName]?.length,
      })
      setServerToggling(serverName)
      // Enable all tools for this server by default
      try {
        // First get the server's available tools
        const serverTools = await window.electronAPI.chat.getMcpServerTools(
          serverName,
          threadId ?? undefined
        )
        if (serverTools?.tools && serverTools.tools.length > 0) {
          const allToolNames = serverTools.tools.map((tool) => tool.name)
          const response = await saveServerTools(serverName, allToolNames)
          if (response.success) {
            invalidateEnabledTools()
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
      trackEvent('Playground: disable all servers', {
        server_count: backendEnabledTools?.length,
      })
      await Promise.allSettled(
        backendEnabledTools.map((serverName) => saveServerTools(serverName, []))
      )
      invalidateEnabledTools()
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
    invalidateEnabledTools()
  }

  const handleOpenSettings = (open: boolean) => {
    trackEvent(`Playground: open manage mcp server settings`)
    setIsOpen(open)
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={handleOpenSettings}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex h-8 items-center justify-between gap-1.5 px-2
                  has-[>svg]:px-2"
                aria-label="MCP server picker"
              >
                <ServerIcon className="size-4" />
                <span className="tabular-nums">{enabledMcpServers.length}</span>
                <ChevronDown
                  className="size-4"
                  data-testid="mcp-server-selector-chevron"
                />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {enabledMcpServers.length} server
            {enabledMcpServers.length === 1 ? '' : 's'}
            {' / '}
            {getTotalToolsCount()} tool
            {getTotalToolsCount() === 1 ? '' : 's'} enabled
          </TooltipContent>
        </Tooltip>
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
        threadId={threadId}
        onToolsChange={handleToolsChange}
      />
    </>
  )
}
