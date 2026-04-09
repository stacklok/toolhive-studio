import type {
  GetApiV1BetaSkillsBuildsResponse,
  GetApiV1BetaSkillsBuildsData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaSkillsBuilds = AutoAPIMock<
  GetApiV1BetaSkillsBuildsResponse,
  GetApiV1BetaSkillsBuildsData
>({
  builds: [
    {
      name: 'my-skill',
      description: 'A locally built skill',
      tag: 'localhost/my-skill:v1.0.0',
      version: 'v1.0.0',
      digest:
        'sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
    },
    {
      name: 'another-skill',
      description: 'Another locally built skill',
      tag: 'localhost/another-skill:latest',
      version: 'latest',
      digest:
        'sha256:def456abc123def456abc123def456abc123def456abc123def456abc123def4',
    },
  ],
}).scenario('empty', (mock) => mock.override(() => ({ builds: [] })))
