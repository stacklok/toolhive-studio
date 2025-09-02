import type { ClientMcpClientStatus } from '@api/types.gen'
import { CardClient } from './card-client'

// Extended client type that includes group information
type ClientWithGroups = ClientMcpClientStatus & {
  groups: string[]
}

export function GridCardClients({
  clients,
  currentGroup,
}: {
  clients: ClientWithGroups[]
  currentGroup: string
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {clients
          .sort((a, b) => a.client_type!.localeCompare(b.client_type!))
          .map((client) => (
            <CardClient
              key={client.client_type}
              client={client}
              currentGroup={currentGroup}
            />
          ))}
      </div>
    </div>
  )
}
