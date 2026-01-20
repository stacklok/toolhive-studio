import type { GetApiV1BetaWorkloadsByNameStatusResponse } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaWorkloadsByNameStatus =
  AutoAPIMock<GetApiV1BetaWorkloadsByNameStatusResponse>({
    status: 'running',
  })
