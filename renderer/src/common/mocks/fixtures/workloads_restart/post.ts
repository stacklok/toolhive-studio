import type {
  PostApiV1BetaWorkloadsRestartResponse,
  PostApiV1BetaWorkloadsRestartData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaWorkloadsRestart = AutoAPIMock<
  PostApiV1BetaWorkloadsRestartResponse,
  PostApiV1BetaWorkloadsRestartData
>('Ut Excepteur sit in aute')
