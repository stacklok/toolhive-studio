import type { GetApiV1BetaGroupsByNameResponse } from '@api/types.gen'

export default {
  name: 'fake-group-name',
  registered_clients: ['client1', 'client2'],
} satisfies GetApiV1BetaGroupsByNameResponse
