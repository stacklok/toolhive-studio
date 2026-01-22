import type {
  GetApiV1BetaRegistryByNameServersResponse,
  GetApiV1BetaRegistryByNameServersData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaRegistryByNameServers = AutoAPIMock<
  GetApiV1BetaRegistryByNameServersResponse,
  GetApiV1BetaRegistryByNameServersData
>({
  servers: [
    {
      name: 'test-server',
      image: 'ghcr.io/test/server:latest',
      tools: ['tool1', 'tool2'],
    },
  ],
  remote_servers: [],
}).scenario('single-server-basic', (mock) => mock)
