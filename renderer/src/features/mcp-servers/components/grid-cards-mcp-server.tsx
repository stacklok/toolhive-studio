import type { WorkloadsWorkload } from '@/common/api/generated'
import { CardMcpServer } from './card-mcp-server'
import { useState, useMemo } from 'react'
import { Input } from '@/common/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'
import { Button } from '@/common/components/ui/button'
import { X } from 'lucide-react'

export function GridCardsMcpServers({
  mcpServers,
}: {
  mcpServers: WorkloadsWorkload[]
}) {
  const [filters, setFilters] = useState({
    text: '',
    state: 'all',
  })

  const availableStates = useMemo(() => {
    const states = mcpServers
      .map((server) => server.status)
      .filter((state): state is string => Boolean(state))
      .filter((state, index, arr) => arr.indexOf(state) === index)
      .sort()
    return ['all', ...states]
  }, [mcpServers])

  const filteredMcpServers = useMemo(() => {
    return mcpServers.filter((mcpServer) => {
      if (filters.text.trim()) {
        const searchTerm = filters.text.toLowerCase()
        const name = mcpServer.name?.toLowerCase() || ''
        const image = mcpServer.package?.toLowerCase() || ''
        if (!name.includes(searchTerm) && !image.includes(searchTerm)) {
          return false
        }
      }

      if (filters.state !== 'all' && mcpServer.status !== filters.state) {
        return false
      }

      return true
    })
  }, [mcpServers, filters])

  return (
    <div className="space-y-6">
      <div className="grid w-full grid-cols-1 place-content-between gap-4 md:grid-cols-6 md:gap-0">
        <div className="relative col-span-4 max-w-md flex-1">
          <Input
            type="text"
            placeholder="Filter by name or image..."
            value={filters.text}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, text: e.target.value }))
            }
            className="pr-10"
          />
          {filters.text && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFilters((prev) => ({ ...prev, text: '' }))}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 h-7 w-7
                -translate-y-1/2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>

        <div className="col-span-2 md:justify-items-end">
          <Select
            value={filters.state}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, state: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {availableStates.map((state) => (
                <SelectItem key={state} value={state}>
                  {state === 'all'
                    ? 'All States'
                    : state.charAt(0).toUpperCase() + state.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredMcpServers.map((mcpServer) => (
          <>
            {mcpServer.name ? (
              <CardMcpServer
                key={mcpServer.name}
                name={mcpServer.name}
                status={mcpServer.status}
                statusContext={mcpServer.status_context}
              />
            ) : null}
          </>
        ))}
      </div>

      {filteredMcpServers.length === 0 &&
        (filters.text || filters.state !== 'all') && (
          <div className="text-muted-foreground py-12 text-center">
            <p className="text-sm">
              No MCP servers found matching the current filters
            </p>
          </div>
        )}
    </div>
  )
}
