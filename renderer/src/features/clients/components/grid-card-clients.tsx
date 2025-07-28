import type { ClientMcpClientStatus } from '@api/types.gen'
import { CardClient } from './card-client'

export function GridCardClients({
  clients,
}: {
  clients: ClientMcpClientStatus[]
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {clients
          .sort((a, b) => a.client_type!.localeCompare(b.client_type!))
          .map((client) => (
            <CardClient key={client.client_type} client={client} />
          ))}
      </div>
    </div>
  )
}
