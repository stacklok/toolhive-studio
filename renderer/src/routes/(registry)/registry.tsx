import { getApiV1BetaRegistryByNameServersOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { createFileRoute } from '@tanstack/react-router'
import { GridCardsRegistryServer } from '@/features/registry-servers/components/grid-cards-registry-server'
import { useSuspenseQuery } from '@tanstack/react-query'
import { EmptyState } from '@/common/components/empty-state'
import { ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'

export const Route = createFileRoute('/(registry)/registry')({
  loader: async ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameServersOptions({ path: { name: 'default' } })
    ),
  component: Registry,
})

export function Registry() {
  const { data } = useSuspenseQuery(
    getApiV1BetaRegistryByNameServersOptions({ path: { name: 'default' } })
  )
  const { servers: serversList = [] } = data || {}

  return (
    <>
      <div className="mb-6 flex items-center">
        <h1 className="text-3xl font-bold">Registry</h1>
      </div>
      {serversList.length === 0 ? (
        <EmptyState
          title="No MCP servers found"
          body="If you are using a custom registry, please ensure it is configured correctly."
          actions={[
            <Button asChild key="docs">
              <a
                href="https://docs.stacklok.com/toolhive/guides-cli/registry#use-a-remote-registry"
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
        <GridCardsRegistryServer servers={serversList} />
      )}
    </>
  )
}
