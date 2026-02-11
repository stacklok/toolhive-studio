import type { CoreWorkload } from '@common/api/generated/types.gen'
import { CardMcpServer } from './card-mcp-server'
import { useMemo, useState } from 'react'
import { InputSearch } from '@/common/components/ui/input-search'
import { cn } from '@/common/lib/utils'
import { EditServerDialogProvider } from '../contexts/edit-server-dialog-provider'
import { useEditServerDialog } from '../hooks/use-edit-server-dialog'
import { WrapperDialogFormMcp } from './wrapper-dialog-mcp'

function GridCardsMcpServersContent({
  mcpServers,
}: {
  mcpServers: CoreWorkload[]
}) {
  const { state, closeDialog } = useEditServerDialog()
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

      <div
        className={cn(
          'grid gap-4',
          visibleMcpServers.length <= 3
            ? 'grid-cols-[repeat(auto-fill,minmax(max(200px,min(300px,100%)),1fr))]'
            : 'grid-cols-[repeat(auto-fit,minmax(max(200px,min(300px,100%)),1fr))]'
        )}
      >
        {visibleMcpServers.map((mcpServer) =>
          mcpServer.name ? (
            <CardMcpServer
              key={mcpServer.name}
              name={mcpServer.name}
              status={mcpServer.status}
              remote={mcpServer.remote}
              statusContext={mcpServer.status_context}
              url={mcpServer.url ?? ''}
              transport={mcpServer.transport_type}
              group={mcpServer.group}
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

      {state.isOpen && state.serverName && state.groupName && (
        <WrapperDialogFormMcp
          serverType={{ local: !state.isRemote, remote: state.isRemote }}
          closeDialog={closeDialog}
          serverToEdit={state.serverName}
          groupName={state.groupName}
          imageOverride={state.imageOverride}
          envVarsOverride={state.envVarsOverride}
          secretsOverride={state.secretsOverride}
        />
      )}
    </div>
  )
}

export function GridCardsMcpServers({
  mcpServers,
}: {
  mcpServers: CoreWorkload[]
}) {
  return (
    <EditServerDialogProvider>
      <GridCardsMcpServersContent mcpServers={mcpServers} />
    </EditServerDialogProvider>
  )
}
