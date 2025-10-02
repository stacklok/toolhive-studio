import type { GetApiV1BetaGroupsResponse } from '@api/types.gen'

export default {
  groups: [
    { name: 'default', registered_clients: ['client-a'] },
    { name: 'research', registered_clients: ['client-b'] },
    { name: 'archive', registered_clients: [] },
  ],
} satisfies GetApiV1BetaGroupsResponse
