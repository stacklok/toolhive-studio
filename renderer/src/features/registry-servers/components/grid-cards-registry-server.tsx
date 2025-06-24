import type { RegistryImageMetadata } from '@/common/api/generated/types.gen'
import { CardRegistryServer } from './card-registry-server'
import { FormRunFromRegistry } from './form-run-from-registry'
import { useState } from 'react'
import { Input } from '@/common/components/ui/input'
import type { FormSchemaRunFromRegistry } from '../lib/get-form-schema-run-from-registry'
import { useFilterSort } from '@/common/hooks/use-filter-sort'

export function GridCardsRegistryServer({
  servers,
  onSubmit,
}: {
  servers: RegistryImageMetadata[]
  onSubmit?: (
    server: RegistryImageMetadata,
    data: FormSchemaRunFromRegistry
  ) => void
}) {
  const [selectedServer, setSelectedServer] =
    useState<RegistryImageMetadata | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const {
    filter,
    setFilter,
    filteredData: filteredServers,
  } = useFilterSort({
    data: servers,
    filterFields: (server) => [server.name || '', server.description || ''],
    sortBy: (server) => server.name || '',
  })

  const handleCardClick = (server: RegistryImageMetadata) => {
    setSelectedServer(server)
    setIsModalOpen(true)
  }

  const handleModalSubmit = (data: FormSchemaRunFromRegistry) => {
    if (selectedServer && onSubmit) {
      onSubmit(selectedServer, data)
    } else {
      // Fallback for when onSubmit is not provided
      console.log('Installing server:', {
        serverName: data.serverName,
        sourceServer: selectedServer,
        envVars: data.envVars,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <Input
          type="text"
          placeholder="Filter by name or description..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredServers.map((server) => (
          <CardRegistryServer
            key={server.name}
            server={server}
            onClick={() => handleCardClick(server)}
          />
        ))}
      </div>
      {filteredServers.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          <p className="text-sm">
            No registry servers found matching the current filter
          </p>
        </div>
      )}

      <FormRunFromRegistry
        key={selectedServer?.name}
        server={selectedServer}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleModalSubmit}
      />
    </div>
  )
}
