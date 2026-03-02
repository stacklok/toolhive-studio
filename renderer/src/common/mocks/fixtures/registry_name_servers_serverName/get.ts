import type {
  GetApiV1BetaRegistryByNameServersByServerNameResponse,
  GetApiV1BetaRegistryByNameServersByServerNameData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaRegistryByNameServersByServerName = AutoAPIMock<
  GetApiV1BetaRegistryByNameServersByServerNameResponse,
  GetApiV1BetaRegistryByNameServersByServerNameData
>({
  is_remote: false,
  server: {
    name: 'time',
    image: 'mcp/time:latest',
    description:
      'MCP server for time info and IANA timezone conversions with auto system timezone detection.',
    tier: 'Official',
    status: 'Active',
    transport: 'stdio',
    permissions: {
      network: {
        outbound: {
          allow_port: [443],
        },
      },
    },
    tools: ['get_current_time', 'convert_time'],
    env_vars: [
      {
        name: 'TIMEZONE',
        description: 'Default timezone for time operations',
        required: false,
      },
      {
        name: 'API_KEY',
        description: 'API key for time service',
        required: false,
        secret: true,
      },
    ],
    args: [],
    metadata: {
      stars: 52153,
      last_updated: '2025-06-18T00:21:32Z',
    },
    repository_url: 'https://github.com/modelcontextprotocol/servers',
    tags: ['time', 'timezone', 'conversions'],
    provenance: {
      sigstore_url: 'tuf-repo-cdn.sigstore.dev',
      repository_uri: 'https://github.com/modelcontextprotocol/servers',
      repository_ref: 'refs/heads/main',
      signer_identity: '/.github/workflows/release.yml',
      runner_environment: 'github-hosted',
      cert_issuer: 'https://token.actions.githubusercontent.com',
    },
  },
})
