import type {
  V1WorkloadListResponse,
  WorkloadsWorkload,
  V1CreateWorkloadResponse,
} from '@/common/api/generated/types.gen'

export const MOCK_MCP_SERVERS = [
  {
    name: 'github',
    package: 'ghcr.io/github/github-mcp-server:latest',
    url: 'http://127.0.0.1:28134/sse#github',
    port: 28134,
    tool_type: 'mcp',
    status: 'stopped' as const,
    status_context: 'Exited (0) 49 minutes ago',
    created_at: '2025-06-09T15:33:15+02:00',
  },
  {
    name: 'osv-2',
    package: 'ghcr.io/stackloklabs/osv-mcp/server:latest',
    url: 'http://127.0.0.1:58766/sse#osv-2',
    port: 58766,
    tool_type: 'mcp',
    status: 'running' as const,
    status_context: 'Up 54 minutes',
    created_at: '2025-06-06T17:57:36+02:00',
  },
  {
    name: 'osv',
    package: 'ghcr.io/stackloklabs/osv-mcp/server:latest',
    url: 'http://127.0.0.1:41317/sse#osv',
    port: 41317,
    tool_type: 'mcp',
    status: 'running' as const,
    status_context: 'Up 54 minutes',
    created_at: '2025-06-06T17:21:14+02:00',
  },
  {
    name: 'fetch',
    package: 'mcp/fetch:latest',
    url: 'http://127.0.0.1:34215/sse#fetch',
    port: 34215,
    tool_type: 'mcp',
    status: 'stopped' as const,
    status_context: 'Exited (137) 4 hours ago',
    created_at: '2025-06-06T14:53:43+02:00',
  },
  {
    name: 'fetch-registry-test',
    package: 'mcp/fetch:latest',
    url: 'http://127.0.0.1:33993/sse#fetch-registry-test',
    port: 33993,
    tool_type: 'mcp',
    status: 'stopped' as const,
    status_context: 'Exited (137) 3 days ago',
    created_at: '2025-06-06T13:04:28+02:00',
  },
  {
    name: 'semgrep',
    package: 'ghcr.io/semgrep/mcp:latest',
    url: 'http://127.0.0.1:36732/sse#semgrep',
    port: 36732,
    tool_type: 'mcp',
    status: 'stopped' as const,
    status_context: 'Exited (0) 3 days ago',
    created_at: '2025-06-05T17:44:40+02:00',
  },
  {
    name: 'slack',
    package: 'mcp/slack:latest',
    url: 'http://127.0.0.1:11501/sse#slack',
    port: 11501,
    tool_type: 'mcp',
    status: 'stopped' as const,
    status_context: 'Exited (137) 4 days ago',
    created_at: '2025-05-23T16:38:30+02:00',
  },
] as const satisfies WorkloadsWorkload[]

export const workloadListFixture: V1WorkloadListResponse = {
  workloads: MOCK_MCP_SERVERS,
}

export const createWorkloadResponseFixture: V1CreateWorkloadResponse = {
  name: 'new-server',
  port: 8080,
}

// Helper function to get a workload by name
export const getWorkloadByName = (
  name: string
): WorkloadsWorkload | undefined => {
  return MOCK_MCP_SERVERS.find((workload) => workload.name === name)
}
