import type {
  PostApiV1BetaWorkloadsByNameRestartResponse,
  PostApiV1BetaWorkloadsByNameRestartData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

export const mockedPostApiV1BetaWorkloadsByNameRestart = AutoAPIMock<
  PostApiV1BetaWorkloadsByNameRestartResponse,
  PostApiV1BetaWorkloadsByNameRestartData
>('Server restarted successfully').scenario('not-found', (mock) =>
  mock.overrideHandler(() =>
    HttpResponse.json({ error: 'Server not found' }, { status: 404 })
  )
)
