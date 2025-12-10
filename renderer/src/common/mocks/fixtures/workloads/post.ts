import type { PostApiV1BetaWorkloadsResponse } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaWorkloads =
  AutoAPIMock<PostApiV1BetaWorkloadsResponse>({
    name: 'fake-workload-name',
    port: 54454,
  })
