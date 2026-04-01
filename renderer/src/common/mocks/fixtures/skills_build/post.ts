import type {
  PostApiV1BetaSkillsBuildResponse,
  PostApiV1BetaSkillsBuildData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

export const mockedPostApiV1BetaSkillsBuild = AutoAPIMock<
  PostApiV1BetaSkillsBuildResponse,
  PostApiV1BetaSkillsBuildData
>({
  reference: 'ghcr.io/org/skill-one:v1',
}).scenario('server-error', (mock) =>
  mock.overrideHandler(() =>
    HttpResponse.json({ error: 'Failed to build' }, { status: 500 })
  )
)
