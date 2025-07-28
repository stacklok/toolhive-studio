import type { RegistryImageMetadata } from '@api/types.gen'
import { CardRegistryServer } from './card-registry-server'
import { useMemo } from 'react'
import { useFilterSort } from '@/common/hooks/use-filter-sort'
import { InputSearch } from '@/common/components/ui/input-search'
import { useNavigate } from '@tanstack/react-router'

export function GridCardsRegistryServer({
  servers,
}: {
  servers: RegistryImageMetadata[]
}) {
  const navigate = useNavigate()
  // Filter out filesystem servers
  const filteredServers = useMemo(() => {
    return servers.filter((server) => server.name !== 'filesystem')
  }, [servers])

  const {
    filter,
    setFilter,
    filteredData: filteredAndSortedServers,
  } = useFilterSort({
    data: filteredServers,
    filterFields: (server) => [server.name || '', server.description || ''],
    sortBy: (server) => server.name || '',
  })

  return (
    <div className="space-y-6">
      <InputSearch
        value={filter}
        onChange={(v) => setFilter(v)}
        placeholder="Search..."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredAndSortedServers.map((server) => (
          <CardRegistryServer
            key={server.name}
            server={server}
            onClick={() => {
              navigate({
                to: '/registry/$name',
                params: { name: server.name! },
              })
            }}
          />
        ))}
      </div>
      {filteredAndSortedServers.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          <p className="text-sm">
            No registry servers found matching the current filter
          </p>
        </div>
      )}
    </div>
  )
}
