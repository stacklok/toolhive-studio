import type { GetApiV1BetaGroupsByNameResponse } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaGroupsByName =
  AutoAPIMock<GetApiV1BetaGroupsByNameResponse>({
    name: 'fake-group-name',
    registered_clients: ['client1', 'client2'],
  })
