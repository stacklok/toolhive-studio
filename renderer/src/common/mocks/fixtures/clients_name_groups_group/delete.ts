import type {
  DeleteApiV1BetaClientsByNameGroupsByGroupResponse,
  DeleteApiV1BetaClientsByNameGroupsByGroupData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

// Delete client from group returns 204 No Content on success
export const mockedDeleteApiV1BetaClientsByNameGroupsByGroup = AutoAPIMock<
  DeleteApiV1BetaClientsByNameGroupsByGroupResponse,
  DeleteApiV1BetaClientsByNameGroupsByGroupData
>(
  undefined as unknown as DeleteApiV1BetaClientsByNameGroupsByGroupResponse
).overrideHandler(() => new HttpResponse(null, { status: 204 }))
