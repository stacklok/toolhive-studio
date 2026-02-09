import {
  getApiV1BetaRegistryByNameServersOptions,
  getApiV1BetaRegistryByNameOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import { useSuspenseQuery } from '@tanstack/react-query'
import { GridCardsRegistry } from '@/features/registry-servers/components/grid-cards-registry'
import { EmptyState } from '@/common/components/empty-state'
import { ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { TitlePage } from '@/common/components/title-page'
import { InputSearch } from '@/common/components/ui/input-search'
import { useFilterSort } from '@/common/hooks/use-filter-sort'
import {
  DEPRECATED_MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
  MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
} from '@/common/lib/constants'
import { META_MCP_SERVER_NAME } from '@/common/lib/constants'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '@utils/feature-flags'
import type { RegistryItem } from '@/features/registry-servers/types'

const SKIP_META_MCP = [
  DEPRECATED_MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
  MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
]
const DEFAULT_REGISTRY_NAME = 'default'

export default function RegistryRouteComponent() {
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)
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

  const filteredServers =
    isMetaOptimizerEnabled && isDefaultRegistry
      ? servers.filter((server) => server.name !== META_MCP_SERVER_NAME)
      : servers

  const items: RegistryItem[] = [
    ...groups.map((group) => ({ ...group, type: 'group' as const })),
    ...filteredServers.map((server) => ({
      ...server,
      type: 'server' as const,
    })),
  ]

  const { filter, setFilter, filteredData } = useFilterSort({
    data: items,
    filterFields: (item) => [item.name || '', item.description || ''],
    sortBy: (item) => item.name || '',
  })

  const hasContent = servers.length > 0 || groups.length > 0

  return (
    <>
      <TitlePage title="Registry">
        {hasContent && (
          <InputSearch
            value={filter}
            onChange={(v) => setFilter(v)}
            placeholder="Search..."
          />
        )}
      </TitlePage>
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
        <GridCardsRegistry items={filteredData} />
      )}
    </>
  )
}
