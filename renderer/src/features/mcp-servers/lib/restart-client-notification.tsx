import { getApiV1BetaDiscoveryClientsOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { toast } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'

const CLIENTS_TO_RESTART = ['claude-code']

export async function restartClientNotification({
  queryClient,
}: {
  queryClient: QueryClient
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

  return toast.warning(
    `Restart ${matchedClient.client_type} to activate new MCP servers.`,
    {
      duration: Infinity,
      id: `restart-${matchedClient.client_type}`,
    }
  )
}
