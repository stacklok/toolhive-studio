import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
  RegistryGroup,
} from '@api/types.gen'
import { CardRegistryServer } from './card-registry-server'
import { CardRegistryGroup } from './card-registry-group'
import { useFilterSort } from '@/common/hooks/use-filter-sort'
import { InputSearch } from '@/common/components/ui/input-search'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/common/lib/utils'

type RegistryItem =
  | ({ type: 'server' } & (
      | RegistryImageMetadata
      | RegistryRemoteServerMetadata
    ))
  | ({ type: 'group' } & RegistryGroup)

export function GridCardsRegistryServer({
  servers,
  groups = [],
}: {
  servers: (RegistryImageMetadata | RegistryRemoteServerMetadata)[]
  groups?: RegistryGroup[]
}) {
  const navigate = useNavigate()

  const items: RegistryItem[] = [
    ...groups.map((group) => ({ ...group, type: 'group' as const })),
    ...servers.map((server) => ({ ...server, type: 'server' as const })),
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
        {filteredAndSortedItems.map((item) =>
          item.type === 'group' ? (
            <CardRegistryGroup
              key={item.name}
              group={item}
              onClick={() => {
                navigate({
                  to: '/registry/$name',
                  params: { name: item.name! },
                })
              }}
            />
          ) : (
            <CardRegistryServer
              key={item.name}
              server={item}
              onClick={() => {
                navigate({
                  to: '/registry/$name',
                  params: { name: item.name! },
                })
              }}
            />
          )
        )}
      </div>
      {filteredAndSortedItems.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          <p className="text-sm">
            No registry items found matching the current filter
          </p>
        </div>
      )}
    </div>
  )
}
