import type { GetHealthResponse, GetHealthData } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetHealth = AutoAPIMock<GetHealthResponse, GetHealthData>('')
