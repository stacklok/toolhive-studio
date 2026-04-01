import type {
  GetApiV1BetaSkillsResponse,
  GetApiV1BetaSkillsData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaSkills = AutoAPIMock<
  GetApiV1BetaSkillsResponse,
  GetApiV1BetaSkillsData
>({
  skills: [
    {
      reference: 'ghcr.io/org/skill-one:v1',
      status: 'installed',
      scope: 'user',
      metadata: {
        name: 'skill-one',
        description: 'First test skill',
      },
    },
    {
      reference: 'ghcr.io/org/skill-two:v1',
      status: 'installed',
      scope: 'project',
      project_root: '/home/user/project',
      metadata: {
        name: 'skill-two',
        description: 'Second test skill',
      },
    },
  ],
}).scenario('empty', (mock) => mock.override(() => ({ skills: [] })))
