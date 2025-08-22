import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Badge } from '@/common/components/ui/badge'
import { Input } from '@/common/components/ui/input'
import { Search, CheckCircle } from 'lucide-react'

interface ToolhiveMcpToolsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  toolhiveMcpInfo: {
    available: boolean
    toolCount: number
    tools: Array<{ name: string; description: string }>
  }
}

export function ToolhiveMcpToolsModal({
  open,
  onOpenChange,
  toolhiveMcpInfo,
}: ToolhiveMcpToolsModalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter tools based on search query
  const filteredTools = toolhiveMcpInfo.tools.filter((tool) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query)
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[80vh] min-h-[400px] w-full max-w-2xl flex-col
          p-0"
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <span>Toolhive MCP Server</span>
            <Badge variant="outline" className="text-xs">
              Playground Only
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Built-in MCP tools provided by Toolhive. These tools are always
            enabled and cannot be modified.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col space-y-4 px-6 pb-6">
          {/* Status and Search */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default">Always Enabled</Badge>
                <Badge variant="outline">
                  {toolhiveMcpInfo.toolCount} tools available
                </Badge>
              </div>
            </div>

            <div className="relative">
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
          </div>

          {/* Tools List */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            {filteredTools.length === 0 ? (
              <div
                className="text-muted-foreground flex h-32 items-center
                  justify-center text-sm"
              >
                {searchQuery
                  ? 'No tools match your search'
                  : 'No tools available'}
              </div>
            ) : (
              filteredTools.map((tool) => (
                <div
                  key={tool.name}
                  className="border-border flex items-start justify-between
                    rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">{tool.name}</h4>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    {tool.description && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {tool.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Info Footer */}
          <div className="bg-muted text-muted-foreground rounded-lg p-3 text-xs">
            <p>
              💡 These tools are automatically available in chat when Toolhive
              MCP is running. No configuration required.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
