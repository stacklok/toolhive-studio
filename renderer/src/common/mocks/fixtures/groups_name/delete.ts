import type {
  DeleteApiV1BetaGroupsByNameResponse,
  DeleteApiV1BetaGroupsByNameData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedDeleteApiV1BetaGroupsByName = AutoAPIMock<
  DeleteApiV1BetaGroupsByNameResponse,
  DeleteApiV1BetaGroupsByNameData
>('')
