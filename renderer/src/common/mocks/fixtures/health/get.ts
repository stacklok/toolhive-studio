import type { GetHealthResponse, GetHealthData } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

// Health endpoint returns 204 No Content on success
export const mockedGetHealth = AutoAPIMock<GetHealthResponse, GetHealthData>(
  undefined as unknown as GetHealthResponse
).overrideHandler(() => new HttpResponse(null, { status: 204 }))
