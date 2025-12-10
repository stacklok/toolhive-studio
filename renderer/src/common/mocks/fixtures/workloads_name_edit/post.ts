import type { PostApiV1BetaWorkloadsByNameEditResponse } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaWorkloadsByNameEdit =
  AutoAPIMock<PostApiV1BetaWorkloadsByNameEditResponse>({
    name: 'commodo',
    port: 51877,
  })
