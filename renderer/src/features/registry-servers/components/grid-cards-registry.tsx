import { CardRegistry } from './card-registry'
import { CardRegistryPromo } from './card-registry-promo'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/common/lib/utils'
import type { RegistryItem } from '../types'

const PROMO_INDEX = 6

export function GridCardsRegistry({
  items,
  showPromo,
}: {
  items: RegistryItem[]
  showPromo?: boolean
}) {
  const navigate = useNavigate()

  const renderCard = (item: RegistryItem) => (
    <CardRegistry
      key={item.name}
      item={item}
      onClick={() => {
        navigate({
          to:
            item.type === 'group' ? '/registry-group/$name' : '/registry/$name',
          params: { name: item.name! },
        })
      }}
    />
  )

  const insertAt = Math.min(PROMO_INDEX, items.length)

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'grid gap-4',
          items.length <= 3
            ? 'grid-cols-[repeat(auto-fill,minmax(max(200px,min(300px,100%)),1fr))]'
            : 'grid-cols-[repeat(auto-fit,minmax(max(200px,min(300px,100%)),1fr))]'
        )}
      >
        {items.slice(0, insertAt).map(renderCard)}
        {showPromo && <CardRegistryPromo />}
        {items.slice(insertAt).map(renderCard)}
      </div>
      {items.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          <p className="text-sm">
            No servers or groups found matching the current filter
          </p>
        </div>
      )}
    </div>
  )
}
