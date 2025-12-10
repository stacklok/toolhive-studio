import type { GetApiV1BetaGroupsResponse } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaGroups = AutoAPIMock<GetApiV1BetaGroupsResponse>(
  {
    groups: [
      { name: 'default', registered_clients: ['client-a'] },
      { name: 'research', registered_clients: ['client-b'] },
      { name: 'archive', registered_clients: [] },
      { name: 'my group', registered_clients: [] },
    ],
  }
)
