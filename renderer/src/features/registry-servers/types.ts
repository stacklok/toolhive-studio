import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
  RegistryGroup,
} from '@common/api/registry-types'
import type { WithTypeTag } from '@/common/types/utils'

export type RegistryItem =
  | WithTypeTag<'server', RegistryImageMetadata | RegistryRemoteServerMetadata>
  | WithTypeTag<'group', RegistryGroup>
