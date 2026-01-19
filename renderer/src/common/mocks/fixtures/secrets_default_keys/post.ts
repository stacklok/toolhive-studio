import type { PostApiV1BetaSecretsDefaultKeysResponse } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaSecretsDefaultKeys =
  AutoAPIMock<PostApiV1BetaSecretsDefaultKeysResponse>({
    key: 'SECRET_FROM_STORE',
  })
