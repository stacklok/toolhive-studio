import type {
  PutApiV1BetaRegistryByNameResponse,
  PutApiV1BetaRegistryByNameData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPutApiV1BetaRegistryByName = AutoAPIMock<
  PutApiV1BetaRegistryByNameResponse,
  PutApiV1BetaRegistryByNameData
>({
  type: 'default',
})
