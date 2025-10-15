import type { GetApiV1BetaWorkloadsByNameResponse } from '@api/types.gen'

export default {
  name: 'postgres-db',
  image: 'ghcr.io/postgres/postgres-mcp-server:latest',
  transport: 'stdio',
  host: '127.0.0.1',
  target_port: 28135,
  cmd_arguments: [],
  env_vars: {},
  secrets: [],
  volumes: [],
  network_isolation: false,
  group: 'default',
} satisfies GetApiV1BetaWorkloadsByNameResponse
