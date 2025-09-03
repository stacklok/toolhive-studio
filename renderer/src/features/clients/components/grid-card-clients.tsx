import { CardClient } from './card-client'
import type { ClientMcpClientStatus } from '@api/types.gen'

export function GridCardClients({
  clients,
  groupName,
}: {
  clients: ClientMcpClientStatus[]
  groupName: string
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => (
        <CardClient
          key={client.client_type}
          client={client}
          groupName={groupName}
        />
      ))}
    </div>
  )
}
