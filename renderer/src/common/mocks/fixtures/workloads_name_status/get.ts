import type {
  GetApiV1BetaWorkloadsByNameStatusResponse,
  GetApiV1BetaWorkloadsByNameStatusData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaWorkloadsByNameStatus = AutoAPIMock<
  GetApiV1BetaWorkloadsByNameStatusResponse,
  GetApiV1BetaWorkloadsByNameStatusData
>({
  status: 'running',
})
