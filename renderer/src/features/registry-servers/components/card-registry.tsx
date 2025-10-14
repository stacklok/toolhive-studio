import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
  RegistryGroup,
} from '@api/types.gen'
import { CardRegistryServer } from './card-registry-server'
import { CardRegistryGroup } from './card-registry-group'
import type { WithTypeTag } from '@/common/types/utils'

type RegistryItem =
  | WithTypeTag<'server', RegistryImageMetadata | RegistryRemoteServerMetadata>
  | WithTypeTag<'group', RegistryGroup>

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
