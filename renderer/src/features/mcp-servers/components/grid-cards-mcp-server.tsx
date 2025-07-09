import type { WorkloadsWorkload } from '@/common/api/generated'
import { CardMcpServer } from './card-mcp-server'
import { useState, useMemo } from 'react'
import { InputSearch } from '@/common/components/ui/input-search'

export function GridCardsMcpServers({
  mcpServers,
}: {
  mcpServers: WorkloadsWorkload[]
}) {
  const [filters, setFilters] = useState({
    text: '',
    state: 'all',
  })

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
      <InputSearch
        onChange={(v) => setFilters((prev) => ({ ...prev, text: v }))}
        value={filters.text}
        placeholder="Search..."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredMcpServers.map((mcpServer) =>
          mcpServer.name ? (
            <CardMcpServer
              key={mcpServer.name}
              name={mcpServer.name}
              status={mcpServer.status}
              statusContext={mcpServer.status_context}
              url={mcpServer.url ?? ''}
              transport={mcpServer.transport_type}
            />
          ) : null
        )}
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
