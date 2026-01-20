import type { GetApiV1BetaWorkloadsResponse } from '@api/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaWorkloads =
  AutoAPIMock<GetApiV1BetaWorkloadsResponse>({
    workloads: [
      {
        name: 'postgres-db',
        package: 'ghcr.io/postgres/postgres-mcp-server:latest',
        url: 'http://127.0.0.1:28135/sse#postgres-db',
        port: 28135,
        status: 'stopped',
        status_context: 'Exited (0) 30 minutes ago',
        created_at: '2025-06-09T15:35:15+02:00',
        group: 'default',
      },
      {
        name: 'vscode-server',
        package: 'ghcr.io/vscode/vscode-mcp-server:latest',
        url: 'http://127.0.0.1:28136/sse#vscode-server',
        port: 28136,
        status: 'running',
        status_context: 'Up 45 minutes',
        created_at: '2025-06-09T15:30:15+02:00',
        group: 'default',
      },
      {
        name: 'github',
        package: 'ghcr.io/github/github-mcp-server:latest',
        url: 'http://127.0.0.1:28134/sse#github',
        port: 28134,
        status: 'stopped',
        status_context: 'Exited (0) 49 minutes ago',
        created_at: '2025-06-09T15:33:15+02:00',
        group: 'research',
      },
      {
        name: 'fetch',
        package: 'mcp/fetch:latest',
        url: 'http://127.0.0.1:34215/sse#fetch',
        port: 34215,
        status: 'stopped',
        status_context: 'Exited (137) 4 hours ago',
        created_at: '2025-06-06T14:53:43+02:00',
        group: 'research',
      },
      {
        name: 'osv-2',
        package: 'ghcr.io/stacklok/osv-mcp/server:latest',
        url: 'http://127.0.0.1:58766/sse#osv-2',
        port: 58766,
        status: 'running',
        status_context: 'Up 54 minutes',
        created_at: '2025-06-06T17:57:36+02:00',
        group: 'default',
      },
      {
        name: 'osv',
        package: 'ghcr.io/stacklok/osv-mcp/server:latest',
        url: 'http://127.0.0.1:41317/sse#osv',
        port: 41317,
        status: 'running',
        status_context: 'Up 54 minutes',
        created_at: '2025-06-06T17:21:14+02:00',
        group: 'default',
      },
    ],
  })
