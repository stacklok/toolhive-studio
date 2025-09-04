import { getApiV1BetaDiscoveryClientsOptions } from '@api/@tanstack/react-query.gen'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { GridCardClients } from '@/features/clients/components/grid-card-clients'
import { Button } from '@/common/components/ui/button'
import { ExternalLinkIcon } from 'lucide-react'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { TitlePage } from '@/common/components/title-page'
import { useGroups } from '@/features/mcp-servers/hooks/use-groups'
import { useMemo } from 'react'

export const Route = createFileRoute('/clients/$groupName')({
  component: Clients,
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(getApiV1BetaDiscoveryClientsOptions()),
      queryClient.ensureQueryData({
        queryKey: ['api', 'v1beta', 'groups'],
        queryFn: async () => {
          const { getApiV1BetaGroups } = await import('@api/sdk.gen')
          const response = await getApiV1BetaGroups({
            parseAs: 'text',
            responseStyle: 'data',
          })
          const parsed =
            typeof response === 'string' ? JSON.parse(response) : response
          return parsed
        },
        staleTime: 5_000,
      }),
    ]),
})

export function Clients() {
  const { groupName } = Route.useParams()
  const {
    data: { clients = [] },
  } = useSuspenseQuery(getApiV1BetaDiscoveryClientsOptions())
  
  const { data: groupsData } = useGroups()

  // Combine discovery clients with group membership information
  const clientsWithGroupStatus = useMemo(() => {
    // Find the current group and get its registered clients
    const currentGroup = groupsData?.groups?.find(group => group.name === groupName)
    const registeredClientsInGroup = currentGroup?.registered_clients || []

    return clients
      .filter((client) => client.installed && client.client_type)
      .map((client) => ({
        ...client,
        // Override the registered status to be group-specific
        registered: registeredClientsInGroup.includes(client.client_type || ''),
      }))
  }, [clients, groupsData, groupName])

  const installedClients = clientsWithGroupStatus

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
