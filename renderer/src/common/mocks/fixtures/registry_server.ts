export const registryServerFixture = {
  server: {
    name: 'time',
    image: 'mcp/time:latest',
    description:
      'MCP server for time info and IANA timezone conversions with auto system timezone detection.',
    transport: 'stdio',
    tier: 'official',
    status: 'active',
    permissions: {
      network: { outbound: { allow_transport: ['tcp'], allow_port: [443] } },
    },
    tools: ['get_current_time', 'convert_time'],
    env_vars: [
      {
        name: 'ENV_VAR',
        description: 'foo bar',
        required: false,
      },

      {
        name: 'SECRET',
        description: 'foo bar',
        secret: true,
      },
    ],
    args: [],
    metadata: {
      stars: 52153,
      pulls: 5883,
      last_updated: '2025-06-09T00:23:00Z',
    },
    repository_url: 'https://github.com/modelcontextprotocol/servers',
    tags: [
      'auto',
      'available',
      'configuration',
      'conversions',
      'convert_time',
      'customization',
      'details',
      'detection',
      'example',
      'examples',
    ],
    provenance: {
      sigstore_url: 'tuf-repo-cdn.sigstore.dev',
      repository_uri: 'https://github.com/test/server',
      repository_ref: 'refs/heads/main',
      signer_identity: '/.github/workflows/release.yml',
      runner_environment: 'github-hosted',
      cert_issuer: 'https://token.actions.githubusercontent.com',
    },
  },
}
