import type {
  PostApiV1BetaSecretsDefaultKeysResponse,
  PostApiV1BetaSecretsDefaultKeysData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaSecretsDefaultKeys = AutoAPIMock<
  PostApiV1BetaSecretsDefaultKeysResponse,
  PostApiV1BetaSecretsDefaultKeysData
>({
  key: 'SECRET_FROM_STORE',
})
