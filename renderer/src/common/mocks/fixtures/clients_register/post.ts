import type { PostApiV1BetaClientsRegisterResponse } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedPostApiV1BetaClientsRegister =
  AutoAPIMock<PostApiV1BetaClientsRegisterResponse>([
    {
      groups: ['default', 'research', 'archive', 'my group'],
      name: 'vscode',
    },
  ])
