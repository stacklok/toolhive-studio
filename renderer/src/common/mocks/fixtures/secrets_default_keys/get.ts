import type {
  GetApiV1BetaSecretsDefaultKeysResponse,
  GetApiV1BetaSecretsDefaultKeysData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaSecretsDefaultKeys = AutoAPIMock<
  GetApiV1BetaSecretsDefaultKeysResponse,
  GetApiV1BetaSecretsDefaultKeysData
>({
  keys: [
    { key: 'SECRET_FROM_STORE' },
    { key: 'Github' },
    { key: 'Grafana' },
    { key: 'Slack' },
    { key: 'Jira' },
  ],
}).scenario('empty', (mock) => mock.override(() => ({ keys: [] })))
