import type {
  GetApiV1BetaRegistryResponse,
  GetApiV1BetaRegistryData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

export const mockedGetApiV1BetaRegistry = AutoAPIMock<
  GetApiV1BetaRegistryResponse,
  GetApiV1BetaRegistryData
>({
  registries: [
    {
      name: 'default',
      version: '1.0.0',
      last_updated: '2025-08-06T00:24:28Z',
      server_count: 2,
      type: 'default',
      source: '',
    },
  ],
} as unknown as GetApiV1BetaRegistryResponse).scenario('server-error', (mock) =>
  mock.overrideHandler(() =>
    HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
  )
)
