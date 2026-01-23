import type {
  PostApiV1BetaWorkloadsByNameRestartResponse,
  PostApiV1BetaWorkloadsByNameRestartData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaWorkloadsByNameRestart = AutoAPIMock<
  PostApiV1BetaWorkloadsByNameRestartResponse,
  PostApiV1BetaWorkloadsByNameRestartData
>('Server restarted successfully')
