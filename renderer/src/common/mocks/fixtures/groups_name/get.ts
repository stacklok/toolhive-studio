import type {
  GetApiV1BetaGroupsByNameResponse,
  GetApiV1BetaGroupsByNameData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaGroupsByName = AutoAPIMock<
  GetApiV1BetaGroupsByNameResponse,
  GetApiV1BetaGroupsByNameData
>({
  name: 'fake-group-name',
  registered_clients: ['client1', 'client2'],
})
