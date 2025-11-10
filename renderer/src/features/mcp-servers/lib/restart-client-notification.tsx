import { getApiV1BetaDiscoveryClientsOptions } from '@api/@tanstack/react-query.gen'
import { toast } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'

const CLIENTS_TO_RESTART = ['claude-code']

export async function restartClientNotification({
  queryClient,
  quietly = false,
}: {
  queryClient: QueryClient
  quietly?: boolean
}) {
  const { clients = [] } = await queryClient.ensureQueryData(
    getApiV1BetaDiscoveryClientsOptions()
  )
  const matchedClient = clients
    .filter((client) => client.installed && client.registered)
    .find(
      (client) =>
        client.client_type && CLIENTS_TO_RESTART.includes(client.client_type)
    )!

  if (!matchedClient) return

  if (quietly) return

  return toast.warning(
    `Restart ${matchedClient.client_type} to activate new MCP servers.`,
    {
      duration: 5_000,
      closeButton: true,
      id: `restart-${matchedClient.client_type}`,
    }
  )
}
