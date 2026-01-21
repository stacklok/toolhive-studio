import type {
  GetApiV1BetaRegistryByNameResponse,
  GetApiV1BetaRegistryByNameData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'
import { DEFAULT_REGISTRY } from '../../customHandlers/fixtures/default_registry'

export const mockedGetApiV1BetaRegistryByName = AutoAPIMock<
  GetApiV1BetaRegistryByNameResponse,
  GetApiV1BetaRegistryByNameData
>(DEFAULT_REGISTRY)
