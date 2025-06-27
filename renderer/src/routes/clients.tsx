import { getApiV1BetaDiscoveryClientsOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { GridCardClients } from '@/features/clients/components/grid-card-clients'
import { Button } from '@/common/components/ui/button'
import { ExternalLinkIcon } from 'lucide-react'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'

export const Route = createFileRoute('/clients')({
  component: Clients,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getApiV1BetaDiscoveryClientsOptions()),
})

export function Clients() {
  const {
    data: { clients = [] },
  } = useSuspenseQuery(getApiV1BetaDiscoveryClientsOptions())

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Clients</h1>
      </div>
      {clients.length === 0 ? (
        <EmptyState
          title="No clients detected"
          body="Clients are tools that can connect to ToolHive. If your client is not detected, consult our documentation."
          actions={[
            <Button asChild key="docs">
              <a
                href="https://docs.stacklok.com/toolhive/guides-cli/client-configuration"
                target="_blank"
                rel="noreferrer"
              >
                Documentation <ExternalLinkIcon />
              </a>
            </Button>,
          ]}
          illustration={IllustrationNoConnection}
        />
      ) : (
        <GridCardClients clients={clients} />
      )}
    </>
  )
}
