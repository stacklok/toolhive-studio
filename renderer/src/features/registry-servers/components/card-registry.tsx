import { CardRegistryServer } from './card-registry-server'
import { CardRegistryGroup } from './card-registry-group'
import type { RegistryItem } from '../types'

export function CardRegistry({
  item,
  onClick,
}: {
  item: RegistryItem
  onClick?: () => void
}) {
  if (item.type === 'group') {
    return <CardRegistryGroup group={item} onClick={onClick} />
  }

  return <CardRegistryServer server={item} onClick={onClick} />
}
