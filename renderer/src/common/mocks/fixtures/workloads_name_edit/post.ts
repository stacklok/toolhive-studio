import type {
  PostApiV1BetaWorkloadsByNameEditResponse,
  PostApiV1BetaWorkloadsByNameEditData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaWorkloadsByNameEdit = AutoAPIMock<
  PostApiV1BetaWorkloadsByNameEditResponse,
  PostApiV1BetaWorkloadsByNameEditData
>({
  name: 'commodo',
  port: 51877,
})
