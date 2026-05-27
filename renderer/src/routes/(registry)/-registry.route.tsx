import {
  getApiV1BetaRegistryByNameServersOptions,
  getApiV1BetaRegistryByNameOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import { useSuspenseQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
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
import { RefreshButton } from '@/common/components/refresh-button'
import { TitlePage } from '@/common/components/title-page'
import { TooltipInfoIcon } from '@/common/components/ui/tooltip-info-icon'
import { InputSearch } from '@/common/components/ui/input-search'
import { ViewToggle } from '@/common/components/view-toggle'
import { useFilterSort } from '@/common/hooks/use-filter-sort'
import { useViewPreference } from '@/common/hooks/use-view-preference'
import type { RegistryItem } from '@/features/registry-servers/types'
import { DOCS_BASE_URL } from '@common/app-info'

const DEFAULT_REGISTRY_NAME = 'default'

export default function RegistryRouteComponent() {
  const { data: serversData, refetch: refetchServers } = useSuspenseQuery(
    getApiV1BetaRegistryByNameServersOptions({
      path: { name: DEFAULT_REGISTRY_NAME },
    })
  )

  const { data: registryData, refetch: refetchRegistry } = useSuspenseQuery(
    getApiV1BetaRegistryByNameOptions({
      path: { name: DEFAULT_REGISTRY_NAME },
    })
  )

  const { servers: serversList = [], remote_servers: remoteServersList = [] } =
    (serversData as V1ListServersResponse | undefined) || {}

  const groups =
    (registryData as V1GetRegistryResponse | undefined)?.registry?.groups || []

  const servers = [...serversList, ...remoteServersList]

  const isDefaultRegistry =
    !registryData?.type || registryData.type === 'default'

  const lastUpdated = registryData?.last_updated

  const items: RegistryItem[] = [
    ...groups.map((group: RegistryGroup) => ({
      ...group,
      type: 'group' as const,
    })),
    ...servers.map((server) => ({
      ...server,
      type: 'server' as const,
    })),
  ]

  const { filter, setFilter, filteredData } = useFilterSort({
    data: items,
    filterFields: (item) => [
      item.name || '',
      ('title' in item && item.title) || '',
      item.description || '',
    ],
    sortBy: (item) => item.name || '',
  })

  const hasContent = servers.length > 0 || groups.length > 0

  const { view, setView } = useViewPreference('ui.viewMode.registry')

  return (
    <>
      <TitlePage title="Registry">
        {hasContent && (
          <div className="flex items-center gap-3">
            {!isDefaultRegistry && (
              <>
                {(registryData?.source || lastUpdated) && (
                  <TooltipInfoIcon ariaLabel="Registry details">
                    <div className="flex flex-col gap-1 text-xs">
                      {registryData?.source && (
                        <div>
                          <span className="font-semibold">Source: </span>
                          <code
                            className="text-primary-foreground/70 font-mono
                              break-all"
                          >
                            {registryData.source}
                          </code>
                        </div>
                      )}
                      {lastUpdated && (
                        <div>
                          <span className="font-semibold">Updated: </span>
                          <span className="text-primary-foreground/70">
                            {formatDistanceToNow(new Date(lastUpdated), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </TooltipInfoIcon>
                )}
                <RefreshButton
                  aria-label="Refresh"
                  refresh={() => {
                    void refetchServers()
                    void refetchRegistry()
                  }}
                />
              </>
            )}
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
