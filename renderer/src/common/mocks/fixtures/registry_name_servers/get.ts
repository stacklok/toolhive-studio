import type {
  GetApiV1BetaRegistryByNameServersResponse,
  GetApiV1BetaRegistryByNameServersData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'
import { MOCK_REGISTRY_RESPONSE } from '../../customHandlers/fixtures/registry'

export const mockedGetApiV1BetaRegistryByNameServers = AutoAPIMock<
  GetApiV1BetaRegistryByNameServersResponse,
  GetApiV1BetaRegistryByNameServersData
>({
  servers: MOCK_REGISTRY_RESPONSE,
  remote_servers: [],
})
