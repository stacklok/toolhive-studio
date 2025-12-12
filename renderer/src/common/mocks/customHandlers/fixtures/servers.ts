import type {
  CoreWorkload,
  V1WorkloadListResponse,
  V1CreateWorkloadResponse,
} from '@api/types.gen'

export const MOCK_MCP_SERVERS = [
  {
    name: 'test-server',
    package: 'ghcr.io/test/test-mcp-server:latest',
    url: 'http://127.0.0.1:28137/sse#test-server',
    port: 28137,
    status: 'running' as const,
    status_context: 'Up 30 minutes',
    created_at: '2025-06-09T15:40:15+02:00',
    group: 'default',
    tools: ['tool1', 'tool2'],
    transport_type: 'sse' as const,
  },
  {
    name: 'postgres-db',
    package: 'ghcr.io/postgres/postgres-mcp-server:latest',
    url: 'http://127.0.0.1:28135/sse#postgres-db',
    port: 28135,
    status: 'stopped' as const,
    status_context: 'Exited (0) 30 minutes ago',
    created_at: '2025-06-09T15:35:15+02:00',
    group: 'default',
  },
  {
    name: 'vscode-server',
    package: 'ghcr.io/vscode/vscode-mcp-server:latest',
    url: 'http://127.0.0.1:28136/sse#vscode-server',
    port: 28136,
    status: 'running' as const,
    status_context: 'Up 45 minutes',
    created_at: '2025-06-09T15:30:15+02:00',
    group: 'default',
  },
  {
    name: 'github',
    package: 'ghcr.io/github/github-mcp-server:latest',
    url: 'http://127.0.0.1:28134/sse#github',
    port: 28134,
    status: 'stopped' as const,
    status_context: 'Exited (0) 49 minutes ago',
    created_at: '2025-06-09T15:33:15+02:00',
    group: 'default',
  },
  {
    name: 'osv-2',
    package: 'ghcr.io/stacklok/osv-mcp/server:latest',
    url: 'http://127.0.0.1:58766/sse#osv-2',
    port: 58766,
    status: 'running' as const,
    status_context: 'Up 54 minutes',
    created_at: '2025-06-06T17:57:36+02:00',
    group: 'default',
  },
  {
    name: 'osv',
    package: 'ghcr.io/stacklok/osv-mcp/server:latest',
    url: 'http://127.0.0.1:41317/sse#osv',
    port: 41317,
    status: 'running' as const,
    status_context: 'Up 54 minutes',
    created_at: '2025-06-06T17:21:14+02:00',
    group: 'default',
  },
  {
    name: 'fetch',
    package: 'mcp/fetch:latest',
    url: 'http://127.0.0.1:34215/sse#fetch',
    port: 34215,
    status: 'stopped' as const,
    status_context: 'Exited (137) 4 hours ago',
    created_at: '2025-06-06T14:53:43+02:00',
    group: 'default',
  },
  {
    name: 'fetch-registry-test',
    package: 'mcp/fetch:latest',
    url: 'http://127.0.0.1:33993/sse#fetch-registry-test',
    port: 33993,
    status: 'stopped' as const,
    status_context: 'Exited (137) 3 days ago',
    created_at: '2025-06-06T13:04:28+02:00',
    group: 'default',
  },
  {
    name: 'semgrep',
    package: 'ghcr.io/semgrep/mcp:latest',
    url: 'http://127.0.0.1:36732/sse#semgrep',
    port: 36732,
    status: 'stopped' as const,
    status_context: 'Exited (0) 3 days ago',
    created_at: '2025-06-05T17:44:40+02:00',
    group: 'default',
  },
  {
    name: 'slack',
    package: 'mcp/slack:latest',
    url: 'http://127.0.0.1:11501/sse#slack',
    port: 11501,
    status: 'stopped' as const,
    status_context: 'Exited (137) 4 days ago',
    created_at: '2025-05-23T16:38:30+02:00',
    group: 'default',
  },
] as const satisfies CoreWorkload[]

export const workloadListFixture: V1WorkloadListResponse = {
  workloads: MOCK_MCP_SERVERS,
}

export const createWorkloadResponseFixture: V1CreateWorkloadResponse = {
  name: 'new-server',
  port: 8080,
}

// Helper function to get a workload by name
export const getWorkloadByName = (name: string): CoreWorkload | undefined => {
  return MOCK_MCP_SERVERS.find((workload) => workload.name === name)
}

export const getMockLogs = vi.fn((serverName: string): string => {
  return `[2025-06-09 15:30:00] INFO: Server ${serverName} started successfully
  [2025-06-09 15:30:01] INFO: Loading configuration...
  [2025-06-09 15:30:02] INFO: Configuration loaded successfully
  [2025-06-09 15:30:03] INFO: Initializing database connection...
  [2025-06-09 15:30:04] INFO: Database connection established
  [2025-06-09 15:30:05] INFO: Starting API server...
  [2025-06-09 15:30:06] INFO: API server started on port 8080
  [2025-06-09 15:30:07] INFO: Server ${serverName} is ready to accept connections
  [2025-06-09 15:30:08] INFO: Health check passed
  [2025-06-09 15:30:09] INFO: Monitoring system initialized`
})
