import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
  RegistryGroup,
} from '@api/types.gen'
import { CardRegistryServer } from './card-registry-server'
import { CardRegistryGroup } from './card-registry-group'

type RegistryItem =
  | ({ type: 'server' } & (
      | RegistryImageMetadata
      | RegistryRemoteServerMetadata
    ))
  | ({ type: 'group' } & RegistryGroup)

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
