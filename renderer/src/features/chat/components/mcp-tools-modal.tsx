import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import { Switch } from '@/common/components/ui/switch'
import { Input } from '@/common/components/ui/input'

import { Search, Wrench, AlertCircle, CheckCheck, ListX } from 'lucide-react'
import { cn } from '@/common/lib/utils'
import { getNormalizedServerName } from '../lib/utils'
import { ScrollArea } from '@/common/components/ui/scroll-area'

interface McpToolInfo {
  name: string
  description?: string
  parameters?: Record<string, unknown>
  enabled: boolean
}

interface McpServerToolsResponse {
  serverName: string
  serverPackage?: string
  tools: McpToolInfo[]
  isRunning: boolean
}

interface McpToolsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverName: string
  onToolsChange?: (serverName: string, enabledTools: string[]) => void
}

export function McpToolsModal({
  open,
  onOpenChange,
  serverName,
  onToolsChange,
}: McpToolsModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [localEnabledTools, setLocalEnabledTools] = useState<string[]>([])
  const queryClient = useQueryClient()

  // Fetch tools for the specific server
  const {
    data: serverTools,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['mcp-server-tools', serverName],
    queryFn: async (): Promise<McpServerToolsResponse | null> => {
      return window.electronAPI.chat.getMcpServerTools(serverName)
    },
    enabled: open && !!serverName,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
    refetchOnMount: true, // Always refetch when component mounts
  })

  // Initialize local state when data loads
  useEffect(() => {
    if (serverTools?.tools) {
      const enabledTools = serverTools.tools
        .filter((tool) => tool.enabled)
        .map((tool) => tool.name)

      setLocalEnabledTools(enabledTools)
    }
  }, [serverTools, serverName])

  // Save tools mutation
  const saveToolsMutation = useMutation({
    mutationFn: async (enabledTools: string[]) => {
      return window.electronAPI.chat.saveEnabledMcpTools(
        serverName,
        enabledTools
      )
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate the specific server's tools query
        queryClient.invalidateQueries({
          queryKey: ['mcp-server-tools', serverName],
        })
        // Also invalidate all mcp-server-tools queries to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['mcp-server-tools'] })
        // Invalidate the global enabled MCP tools query
        queryClient.invalidateQueries({ queryKey: ['enabled-mcp-tools'] })
        onToolsChange?.(serverName, localEnabledTools)
        onOpenChange(false)
      }
    },
  })

  const handleToolToggle = (toolName: string) => {
    setLocalEnabledTools((prev) =>
      prev.includes(toolName)
        ? prev.filter((name) => name !== toolName)
        : [...prev, toolName]
    )
  }

  const handleSave = () => {
    saveToolsMutation.mutate(localEnabledTools)
  }

  const handleCancel = () => {
    // Reset to original state
    if (serverTools?.tools) {
      const enabledTools = serverTools.tools
        .filter((tool) => tool.enabled)
        .map((tool) => tool.name)
      setLocalEnabledTools(enabledTools)
    }
    onOpenChange(false)
  }

  const filteredTools =
    serverTools?.tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

  const enabledCount = localEnabledTools.length
  const totalCount = serverTools?.tools.length || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] min-h-[60vh] max-w-3xl flex-col"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Manage tools
          </DialogTitle>
          <div className="flex items-center gap-1">
            {getNormalizedServerName(serverName)}
            <Badge variant="secondary" className="text-muted-foreground">
              {enabledCount} tools enabled
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={() =>
                setLocalEnabledTools(
                  serverTools?.tools.map((t) => t.name) || []
                )
              }
              disabled={enabledCount === totalCount}
              className="cursor-pointer text-xs"
            >
              <CheckCheck className="h-4 w-4" />
              Enable All
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setLocalEnabledTools([])}
              disabled={enabledCount === 0}
              className="cursor-pointer text-xs"
            >
              <ListX className="h-4 w-4" />
              Disable All
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col space-y-4">
          <div className="relative mb-0 pr-2">
            <Search
              className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4
                -translate-y-1/2"
            />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea
            className={cn('min-h-0 flex-1 overflow-y-auto scroll-smooth pt-3')}
          >
            <div className="space-b-1 pr-2 pb-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground text-sm">
                    Loading tools...
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8">
                  <div
                    className="text-destructive flex items-center gap-2 text-sm"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Failed to load tools
                  </div>
                </div>
              ) : !serverTools?.isRunning ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground text-sm">
                    Server is not running. Start the server to see available
                    tools.
                  </div>
                </div>
              ) : filteredTools.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground text-sm">
                    {searchQuery
                      ? 'No tools match your search.'
                      : 'No tools available.'}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTools.map((tool) => (
                    <div
                      key={tool.name}
                      className="bg-card hover:bg-accent/50 flex items-start
                        justify-between gap-3 rounded-lg border p-4
                        transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-blue-500" />
                          <h4 className="text-sm font-medium">{tool.name}</h4>
                        </div>

                        {/* Tool Description */}
                        <div className="mb-3">
                          {tool.description ? (
                            <p
                              className="text-muted-foreground text-sm
                                leading-relaxed"
                            >
                              {tool.description}
                            </p>
                          ) : (
                            <p
                              className="text-muted-foreground/60 text-sm
                                italic"
                            >
                              No description available
                            </p>
                          )}
                        </div>

                        {/* Tool Parameters */}
                        {tool.parameters &&
                          Object.keys(tool.parameters).length > 0 && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {Object.keys(tool.parameters).length} parameter
                                {Object.keys(tool.parameters).length !== 1
                                  ? 's'
                                  : ''}
                              </Badge>
                            </div>
                          )}
                      </div>
                      <Switch
                        checked={localEnabledTools.includes(tool.name)}
                        onCheckedChange={() => handleToolToggle(tool.name)}
                        className="mt-1 shrink-0"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveToolsMutation.isPending || !serverTools?.isRunning}
            className={cn(saveToolsMutation.isPending && 'opacity-50')}
          >
            {saveToolsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
