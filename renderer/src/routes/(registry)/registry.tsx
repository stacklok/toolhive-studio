import {
  getApiV1BetaRegistryByNameServersOptions,
  getApiV1BetaRegistryByNameOptions,
} from '@api/@tanstack/react-query.gen'
import { createFileRoute } from '@tanstack/react-router'
import { GridCardsRegistryServer } from '@/features/registry-servers/components/grid-cards-registry-server'
import { useSuspenseQuery } from '@tanstack/react-query'
import { EmptyState } from '@/common/components/empty-state'
import { ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../utils/feature-flags'

export const Route = createFileRoute('/(registry)/registry')({
  loader: async ({ context: { queryClient } }) => {
    // Fetch servers
    const serversPromise = queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameServersOptions({ path: { name: 'default' } })
    )

    // Fetch full registry (which includes groups) for feature flag users
    const registryPromise = queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameOptions({ path: { name: 'default' } })
    )

    return Promise.all([serversPromise, registryPromise])
  },
  component: Registry,
})

export function Registry() {
  const isGroupsInRegistryEnabled = useFeatureFlag(
    featureFlagKeys.GROUPS_IN_REGISTRY
  )

  const { data: serversData } = useSuspenseQuery(
    getApiV1BetaRegistryByNameServersOptions({ path: { name: 'default' } })
  )

  const { data: registryData } = useSuspenseQuery(
    getApiV1BetaRegistryByNameOptions({ path: { name: 'default' } })
  )

  const { servers: serversList = [], remote_servers: remoteServersList = [] } =
    serversData || {}

  const groups = isGroupsInRegistryEnabled
    ? registryData?.registry?.groups || []
    : []

  const servers = [...serversList, ...remoteServersList]
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
        <GridCardsRegistryServer servers={servers} groups={groups} />
      )}
    </>
  )
}
