import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
  RegistryGroup,
} from '@api/types.gen'
import { CardRegistry } from './card-registry'
import { useFilterSort } from '@/common/hooks/use-filter-sort'
import { InputSearch } from '@/common/components/ui/input-search'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/common/lib/utils'
import type { RegistryItem } from '../types'
import { META_MCP_SERVER_NAME } from '@/common/lib/constants'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../utils/feature-flags'

export function GridCardsRegistry({
  servers,
  groups = [],
  isDefaultRegistry = false,
}: {
  servers: (RegistryImageMetadata | RegistryRemoteServerMetadata)[]
  groups?: RegistryGroup[]
  isDefaultRegistry?: boolean
}) {
  const navigate = useNavigate()
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)

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

  const {
    filter,
    setFilter,
    filteredData: filteredAndSortedItems,
  } = useFilterSort({
    data: items,
    filterFields: (item) => [item.name || '', item.description || ''],
    sortBy: (item) => item.name || '',
  })

  return (
    <div className="space-y-6">
      <InputSearch
        value={filter}
        onChange={(v) => setFilter(v)}
        placeholder="Search..."
      />
      <div
        className={cn(
          'grid gap-4',
          filteredAndSortedItems.length <= 3
            ? 'grid-cols-[repeat(auto-fill,minmax(max(200px,min(300px,100%)),1fr))]'
            : 'grid-cols-[repeat(auto-fit,minmax(max(200px,min(300px,100%)),1fr))]'
        )}
      >
        {filteredAndSortedItems.map((item) => (
          <CardRegistry
            key={item.name}
            item={item}
            onClick={() => {
              navigate({
                to:
                  item.type === 'group'
                    ? '/registry-group/$name'
                    : '/registry/$name',
                params: { name: item.name! },
              })
            }}
          />
        ))}
      </div>
      {filteredAndSortedItems.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          <p className="text-sm">
            No servers or groups found matching the current filter
          </p>
        </div>
      )}
    </div>
  )
}
