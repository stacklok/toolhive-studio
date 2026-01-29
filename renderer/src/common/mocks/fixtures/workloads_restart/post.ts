import type {
  PostApiV1BetaWorkloadsRestartResponse,
  PostApiV1BetaWorkloadsRestartData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

export const mockedPostApiV1BetaWorkloadsRestart = AutoAPIMock<
  PostApiV1BetaWorkloadsRestartResponse,
  PostApiV1BetaWorkloadsRestartData
>('Servers restarted successfully').scenario('not-found', (mock) =>
  mock.overrideHandler(() =>
    HttpResponse.json({ error: 'Server not found' }, { status: 404 })
  )
)
