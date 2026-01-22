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
}).scenario('single-server-basic', (mock) =>
  mock.override(() => ({
    servers: [
      {
        image: 'ghcr.io/test/server:latest',
        tools: ['tool1', 'tool2'],
      },
    ],
  }))
)
