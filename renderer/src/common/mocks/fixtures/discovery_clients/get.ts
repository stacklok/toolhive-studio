import type {
  GetApiV1BetaDiscoveryClientsResponse,
  GetApiV1BetaDiscoveryClientsData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaDiscoveryClients = AutoAPIMock<
  GetApiV1BetaDiscoveryClientsResponse,
  GetApiV1BetaDiscoveryClientsData
>({
  clients: [
    { client_type: 'roo-code', installed: false, registered: false },
    { client_type: 'cline', installed: true, registered: false },
    { client_type: 'vscode-insider', installed: true, registered: false },
    { client_type: 'vscode', installed: true, registered: false },
    { client_type: 'cursor', installed: true, registered: false },
    { client_type: 'claude-code', installed: true, registered: false },
  ],
}).scenario('empty', (mock) => mock.override(() => ({ clients: [] })))
