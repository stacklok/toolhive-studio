import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
  RegistryGroup,
} from '@api/types.gen'
import type { WithTypeTag } from '@/common/types/utils'

export type RegistryItem =
  | WithTypeTag<'server', RegistryImageMetadata | RegistryRemoteServerMetadata>
  | WithTypeTag<'group', RegistryGroup>
