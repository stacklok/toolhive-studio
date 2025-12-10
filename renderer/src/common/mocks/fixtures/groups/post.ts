import type { PostApiV1BetaGroupsResponse } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaGroups =
  AutoAPIMock<PostApiV1BetaGroupsResponse>({
    name: 'fake-group-name',
  })
