import type { GetApiV1BetaSecretsDefaultKeysResponse } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaSecretsDefaultKeys =
  AutoAPIMock<GetApiV1BetaSecretsDefaultKeysResponse>({
    keys: [
      { key: 'SECRET_FROM_STORE' },
      { key: 'Github' },
      { key: 'Grafana' },
      { key: 'Slack' },
      { key: 'Jira' },
    ],
  })
