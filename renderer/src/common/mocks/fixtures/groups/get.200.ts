import type { GetApiV1BetaGroupsResponses } from '../../../../../../api/generated/types.gen'

export default {
  groups: [
    { name: 'default', registered_clients: ['client-a'] },
    { name: 'Research team', registered_clients: ['client-b'] },
    { name: 'Archive', registered_clients: [] },
  ],
} satisfies GetApiV1BetaGroupsResponses[200]
