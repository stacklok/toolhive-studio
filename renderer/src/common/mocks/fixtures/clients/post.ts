import type {
  PostApiV1BetaClientsResponse,
  PostApiV1BetaClientsData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaClients = AutoAPIMock<
  PostApiV1BetaClientsResponse,
  PostApiV1BetaClientsData
>({
  name: 'cursor',
  groups: ['default'],
})
