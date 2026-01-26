import type { GetHealthResponse, GetHealthData } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

// Health endpoint returns 204 No Content - tests override as needed
export const mockedGetHealth = AutoAPIMock<GetHealthResponse, GetHealthData>(
  '' as unknown as GetHealthResponse
)
