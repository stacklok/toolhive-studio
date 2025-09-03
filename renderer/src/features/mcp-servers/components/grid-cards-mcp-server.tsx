import type { CoreWorkload } from '@api/types.gen'
import { CardMcpServer } from './card-mcp-server'
import { useMemo, useState } from 'react'
import { InputSearch } from '@/common/components/ui/input-search'
import { DeprecatedDialogFormRunMcpServerWithCommand } from './dialog-form-run-mcp-command'

export function GridCardsMcpServers({
  mcpServers,
}: {
  mcpServers: CoreWorkload[]
}) {
  const [isRunWithCommandOpen, setIsRunWithCommandOpen] = useState(false)
  const [serverToEdit, setServerToEdit] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    text: '',
    state: 'all',
  })

  const visibleMcpServers = useMemo(() => {
    return mcpServers
      .filter((mcpServer) => {
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
      .sort((a, b) => {
        const aName = (a.name || '').toLowerCase()
        const bName = (b.name || '').toLowerCase()
        return aName.localeCompare(bName)
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
        {visibleMcpServers.map((mcpServer) =>
          mcpServer.name ? (
            <CardMcpServer
              key={mcpServer.name}
              name={mcpServer.name}
              status={mcpServer.status}
              statusContext={mcpServer.status_context}
              url={mcpServer.url ?? ''}
              transport={mcpServer.transport_type}
              onEdit={(serverName) => {
                setServerToEdit(serverName)
                setIsRunWithCommandOpen(true)
              }}
            />
          ) : null
        )}
      </div>

      {visibleMcpServers.length === 0 &&
        (filters.text || filters.state !== 'all') && (
          <div className="text-muted-foreground py-12 text-center">
            <p className="text-sm">
              No MCP servers found matching the current filters
            </p>
          </div>
        )}

      <DeprecatedDialogFormRunMcpServerWithCommand
        isOpen={isRunWithCommandOpen}
        onOpenChange={setIsRunWithCommandOpen}
        serverToEdit={serverToEdit}
      />
    </div>
  )
}
