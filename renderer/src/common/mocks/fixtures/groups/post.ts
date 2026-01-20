import type {
  PostApiV1BetaGroupsResponse,
  PostApiV1BetaGroupsData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaGroups = AutoAPIMock<
  PostApiV1BetaGroupsResponse,
  PostApiV1BetaGroupsData
>({
  name: 'fake-group-name',
})
