import type {
  PostApiV1BetaClientsRegisterResponse,
  PostApiV1BetaClientsRegisterData,
} from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaClientsRegister = AutoAPIMock<
  PostApiV1BetaClientsRegisterResponse,
  PostApiV1BetaClientsRegisterData
>([
  {
    groups: ['default', 'research', 'archive', 'my group'],
    name: 'vscode',
  },
])
