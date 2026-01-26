import type {
  PostApiV1BetaWorkloadsByNameEditResponse,
  PostApiV1BetaWorkloadsByNameEditData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

export const mockedPostApiV1BetaWorkloadsByNameEdit = AutoAPIMock<
  PostApiV1BetaWorkloadsByNameEditResponse,
  PostApiV1BetaWorkloadsByNameEditData
>({
  name: 'postgres-db',
  port: 28135,
}).scenario('server-error', (mock) =>
  mock.overrideHandler(() =>
    HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
  )
)
