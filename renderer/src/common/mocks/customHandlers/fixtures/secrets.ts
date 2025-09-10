import type { V1SecretKeyResponse, V1ListSecretsResponse } from '@api/types.gen'

const MOCK_SECRETS = [
  { key: 'Github' },
  { key: 'Grafana' },
  { key: 'Slack' },
  { key: 'Jira' },
] as const satisfies V1SecretKeyResponse[]

export const secretsListFixture: V1ListSecretsResponse = {
  keys: MOCK_SECRETS,
}
