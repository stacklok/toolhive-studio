import type { ClientMcpClientStatus } from '@/common/api/generated'
import { InfoIcon } from 'lucide-react'
import { CardClient } from './card-client'
import { Alert, AlertDescription } from '@/common/components/ui/alert'

export function GridCardClients({
  clients,
}: {
  clients: ClientMcpClientStatus[]
}) {
  return (
    <div className="space-y-6">
      <Alert className="border-none">
        <InfoIcon />
        <AlertDescription>
          The clients may need to be restarted for the new MCP servers to be
          properly enabled.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {clients
          .filter((client) => client.installed && client.client_type)
          .sort((a, b) => a.client_type!.localeCompare(b.client_type!))
          .map((client) => (
            <CardClient key={client.client_type} client={client} />
          ))}
      </div>
    </div>
  )
}
