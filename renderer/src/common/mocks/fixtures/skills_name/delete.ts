import type {
  DeleteApiV1BetaSkillsByNameResponse,
  DeleteApiV1BetaSkillsByNameData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

// DELETE endpoint returns 204 No Content
export const mockedDeleteApiV1BetaSkillsByName = AutoAPIMock<
  DeleteApiV1BetaSkillsByNameResponse,
  DeleteApiV1BetaSkillsByNameData
>('' as unknown as DeleteApiV1BetaSkillsByNameResponse).scenario(
  'server-error',
  (mock) =>
    mock.overrideHandler(() =>
      HttpResponse.json({ error: 'Failed to uninstall' }, { status: 500 })
    )
)
