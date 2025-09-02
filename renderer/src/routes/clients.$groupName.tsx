import {
  getApiV1BetaClientsOptions,
  getApiV1BetaDiscoveryClientsOptions,
} from '@api/@tanstack/react-query.gen'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { GridCardClients } from '@/features/clients/components/grid-card-clients'
import { Button } from '@/common/components/ui/button'
import { ExternalLinkIcon } from 'lucide-react'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { TitlePage } from '@/common/components/title-page'
import type { ClientMcpClientStatus } from '@api/types.gen'

// Extended client type that includes group information
type ClientWithGroups = ClientMcpClientStatus & {
  groups: string[]
}

export const Route = createFileRoute('/clients/$groupName')({
  component: Clients,
  loader: ({ context: { queryClient } }) => {
    // Load both registered clients (for group info) and discovery clients (for status info)
    queryClient.ensureQueryData(getApiV1BetaClientsOptions())
    queryClient.ensureQueryData(getApiV1BetaDiscoveryClientsOptions())
  },
})

export function Clients() {
  const { groupName } = Route.useParams()
  const {
    data: { clients: discoveryClients = [] },
  } = useSuspenseQuery(getApiV1BetaDiscoveryClientsOptions())

  const { data: registeredClients = [] } = useSuspenseQuery(
    getApiV1BetaClientsOptions()
  )

  // Merge discovery clients with registration info to get group information
  const clientsWithGroups: ClientWithGroups[] = discoveryClients.map(
    (discoveryClient) => {
      const registeredClient = registeredClients.find(
        (regClient) => regClient.name === discoveryClient.client_type
      )

      return {
        ...discoveryClient,
        groups: registeredClient?.groups || [],
      }
    }
  )

  // Only show installed clients, but they will be displayed as disabled if they don't belong to the current group
  const installedClients = clientsWithGroups.filter(
    (client) => client.client_type && client.installed
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
        <GridCardClients clients={installedClients} currentGroup={groupName} />
      )}
    </>
  )
}
