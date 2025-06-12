export const registryServerFixture = {
  server: {
    name: 'time',
    image: 'mcp/time:latest',
    description:
      'MCP server for time info and IANA timezone conversions with auto system timezone detection.',
    transport: 'stdio',
    permissions: {
      network: { outbound: { allow_transport: ['tcp'], allow_port: [443] } },
    },
    tools: ['get_current_time', 'convert_time'],
    env_vars: [],
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
  },
}
