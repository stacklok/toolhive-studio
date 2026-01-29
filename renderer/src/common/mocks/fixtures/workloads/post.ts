import type {
  PostApiV1BetaWorkloadsResponse,
  PostApiV1BetaWorkloadsData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaWorkloads = AutoAPIMock<
  PostApiV1BetaWorkloadsResponse,
  PostApiV1BetaWorkloadsData
>({
  name: 'fake-workload-name',
  port: 54454,
})
