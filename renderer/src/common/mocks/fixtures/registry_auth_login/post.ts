import type {
  PostApiV1BetaRegistryAuthLoginResponse,
  PostApiV1BetaRegistryAuthLoginData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

export const mockedPostApiV1BetaRegistryAuthLogin = AutoAPIMock<
  PostApiV1BetaRegistryAuthLoginResponse,
  PostApiV1BetaRegistryAuthLoginData
>({} as PostApiV1BetaRegistryAuthLoginResponse).scenario(
  'server-error',
  (mock) =>
    mock.overrideHandler(() =>
      HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
    )
)
