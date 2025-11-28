import {
  getApiV1BetaRegistryByNameServersOptions,
  getApiV1BetaRegistryByNameOptions,
} from '@api/@tanstack/react-query.gen'
import { createFileRoute } from '@tanstack/react-router'
import { GridCardsRegistry } from '@/features/registry-servers/components/grid-cards-registry'
import { useSuspenseQuery } from '@tanstack/react-query'
import { EmptyState } from '@/common/components/empty-state'
import { ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import {
  DEPRECATED_MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
  MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
} from '@/common/lib/constants'

const SKIP_META_MCP = [
  DEPRECATED_MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
  MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
]
const DEFAULT_REGISTRY_NAME = 'default'

export const Route = createFileRoute('/(registry)/registry')({
  loader: async ({ context: { queryClient } }) => {
    const serversPromise = queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameServersOptions({
        path: { name: DEFAULT_REGISTRY_NAME },
      })
    )
    const registryPromise = queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameOptions({
        path: { name: DEFAULT_REGISTRY_NAME },
      })
    )
    return Promise.all([serversPromise, registryPromise])
  },
  component: Registry,
})

export function Registry() {
  const { data: serversData } = useSuspenseQuery(
    getApiV1BetaRegistryByNameServersOptions({
      path: { name: DEFAULT_REGISTRY_NAME },
    })
  )

  const { data: registryData } = useSuspenseQuery(
    getApiV1BetaRegistryByNameOptions({
      path: { name: DEFAULT_REGISTRY_NAME },
    })
  )

  const { servers: serversList = [], remote_servers: remoteServersList = [] } =
    serversData || {}

  const groups = registryData?.registry?.groups || []

  const servers = [...serversList, ...remoteServersList].filter(
    (server) => !SKIP_META_MCP.includes(server.name ?? '')
  )

  const isDefaultRegistry = registryData?.name === DEFAULT_REGISTRY_NAME
  const hasContent = servers.length > 0 || groups.length > 0

  return (
    <>
      <div className="mb-6 flex items-center">
        <h1 className="text-3xl font-bold">Registry</h1>
      </div>
      {!hasContent ? (
        <EmptyState
          title="No MCP servers found"
          body="If you are using a custom registry, please ensure it is configured correctly."
          actions={[
            <Button asChild key="docs">
              <a
                href="https://docs.stacklok.com/toolhive/guides-ui/registry#registry-settings"
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
        <GridCardsRegistry
          servers={servers}
          groups={groups}
          isDefaultRegistry={isDefaultRegistry}
        />
      )}
    </>
  )
}
