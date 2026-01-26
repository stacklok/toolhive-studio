import type {
  GetApiV1BetaSecretsDefaultKeysResponse,
  GetApiV1BetaSecretsDefaultKeysData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

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
})
  .scenario('empty', (mock) => mock.override(() => ({ keys: [] })))
  .scenario('server-error', (mock) =>
    mock.overrideHandler(() =>
      HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
    )
  )
