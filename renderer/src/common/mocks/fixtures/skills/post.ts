import type {
  PostApiV1BetaSkillsResponse,
  PostApiV1BetaSkillsData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

export const mockedPostApiV1BetaSkills = AutoAPIMock<
  PostApiV1BetaSkillsResponse,
  PostApiV1BetaSkillsData
>({
  skill: {
    reference: 'ghcr.io/org/skill-one:v1',
    status: 'installed',
    scope: 'user',
    metadata: {
      name: 'skill-one',
      description: 'First test skill',
    },
  },
}).scenario('server-error', (mock) =>
  mock.overrideHandler(() =>
    HttpResponse.json({ error: 'Failed to install' }, { status: 500 })
  )
)
