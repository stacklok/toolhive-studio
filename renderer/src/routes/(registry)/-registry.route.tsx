import {
  getApiV1BetaRegistryByNameServersOptions,
  getApiV1BetaRegistryByNameOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import { useSuspenseQuery } from '@tanstack/react-query'
import type {
  RegistryGroup,
  V1GetRegistryResponse,
  V1ListServersResponse,
} from '@common/api/registry-types'
import { GridCardsRegistry } from '@/features/registry-servers/components/grid-cards-registry'
import { TableRegistry } from '@/features/registry-servers/components/table-registry'
import { EmptyState } from '@/common/components/empty-state'
import { ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { TitlePage } from '@/common/components/title-page'
import { InputSearch } from '@/common/components/ui/input-search'
import { ViewToggle } from '@/common/components/view-toggle'
import { useFilterSort } from '@/common/hooks/use-filter-sort'
import { useViewPreference } from '@/common/hooks/use-view-preference'
import {
  DEPRECATED_MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
  MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
} from '@/common/lib/constants'
import { META_MCP_SERVER_NAME } from '@/common/lib/constants'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '@utils/feature-flags'
import type { RegistryItem } from '@/features/registry-servers/types'
import { DOCS_BASE_URL } from '@common/app-info'

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
    (serversData as V1ListServersResponse | undefined) || {}

  const groups =
    (registryData as V1GetRegistryResponse | undefined)?.registry?.groups || []

  const servers = [...serversList, ...remoteServersList].filter(
    (server) => !SKIP_META_MCP.includes(server.name ?? '')
  )

  const isDefaultRegistry =
    !registryData?.type || registryData.type === 'default'

  const filteredServers =
    isMetaOptimizerEnabled && isDefaultRegistry
      ? servers.filter((server) => server.name !== META_MCP_SERVER_NAME)
      : servers

  const items: RegistryItem[] = [
    ...groups.map((group: RegistryGroup) => ({
      ...group,
      type: 'group' as const,
    })),
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

  const { view, setView } = useViewPreference('ui.viewMode.registry')

  return (
    <>
      <TitlePage title="Registry">
        {hasContent && (
          <div className="flex items-center gap-3">
            <InputSearch
              value={filter}
              onChange={(v) => setFilter(v)}
              placeholder="Search..."
            />
            <ViewToggle value={view} onChange={setView} />
          </div>
        )}
      </TitlePage>
      {!hasContent ? (
        <EmptyState
          title="No MCP servers found"
          body="If you are using a custom registry, please ensure it is configured correctly."
          actions={[
            <Button asChild key="docs">
              <a
                href={`${DOCS_BASE_URL}/guides-ui/registry#registry-settings`}
                target="_blank"
                rel="noreferrer"
              >
                Documentation <ExternalLinkIcon />
              </a>
            </Button>,
          ]}
          illustration={IllustrationNoConnection}
        />
      ) : view === 'table' ? (
        <TableRegistry items={filteredData} showPromo={isDefaultRegistry} />
      ) : (
        <GridCardsRegistry items={filteredData} showPromo={isDefaultRegistry} />
      )}
    </>
  )
}
