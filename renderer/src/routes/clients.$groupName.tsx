import { getApiV1BetaDiscoveryClientsOptions } from '@api/@tanstack/react-query.gen'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { GridCardClients } from '@/features/clients/components/grid-card-clients'
import { Button } from '@/common/components/ui/button'
import { ExternalLinkIcon } from 'lucide-react'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { TitlePage } from '@/common/components/title-page'

export const Route = createFileRoute('/clients/$groupName')({
  component: Clients,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getApiV1BetaDiscoveryClientsOptions()),
})

export function Clients() {
  const { groupName } = Route.useParams()
  const {
    data: { clients = [] },
  } = useSuspenseQuery(getApiV1BetaDiscoveryClientsOptions())

  const installedClients = clients.filter(
    (client) => client.installed && client.client_type
  )

  return (
    <>
      <TitlePage title="Clients" />
      {installedClients.length === 0 ? (
        <EmptyState
          title="No clients detected"
          body="Clients are tools that can connect to ToolHive. If your client is not detected, consult the documentation."
          actions={[
            <Button asChild key="docs">
              <a
                href="https://docs.stacklok.com/toolhive/guides-ui/client-configuration"
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
        <GridCardClients clients={installedClients} groupName={groupName} />
      )}
    </>
  )
}
