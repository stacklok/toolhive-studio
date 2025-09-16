import type { GetApiV1BetaDiscoveryClientsResponse } from '@api/types.gen'

export default {
  clients: [
    { client_type: 'roo-code', installed: false, registered: false },
    { client_type: 'cline', installed: true, registered: false },
    { client_type: 'vscode-insider', installed: true, registered: false },
    { client_type: 'vscode', installed: true, registered: false },
    { client_type: 'cursor', installed: true, registered: false },
    { client_type: 'claude-code', installed: true, registered: false },
  ],
} satisfies GetApiV1BetaDiscoveryClientsResponse
