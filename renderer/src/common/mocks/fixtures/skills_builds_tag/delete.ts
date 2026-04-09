import type {
  DeleteApiV1BetaSkillsBuildsByTagResponse,
  DeleteApiV1BetaSkillsBuildsByTagData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

// DELETE endpoint returns 204 No Content
export const mockedDeleteApiV1BetaSkillsBuildsByTag = AutoAPIMock<
  DeleteApiV1BetaSkillsBuildsByTagResponse,
  DeleteApiV1BetaSkillsBuildsByTagData
>('' as unknown as DeleteApiV1BetaSkillsBuildsByTagResponse).scenario(
  'server-error',
  (mock) =>
    mock.overrideHandler(() =>
      HttpResponse.json({ error: 'Failed to remove build' }, { status: 500 })
    )
)
