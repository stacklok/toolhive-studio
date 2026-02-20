import type {
  GetApiV1BetaRegistryByNameServersResponse,
  GetApiV1BetaRegistryByNameServersData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'

export const mockedGetApiV1BetaRegistryByNameServers = AutoAPIMock<
  GetApiV1BetaRegistryByNameServersResponse,
  GetApiV1BetaRegistryByNameServersData
>({
  servers: [
    {
      name: 'time',
      image: 'mcp/time:latest',
      description:
        'MCP server for time info and IANA timezone conversions with auto system timezone detection.',
      transport: 'stdio',
      permissions: {
        network: {
          outbound: {
            allow_port: [443],
          },
        },
      },
      tools: ['get_current_time', 'convert_time'],
      env_vars: [],
      args: [],
      metadata: {
        stars: 54338,
        last_updated: '2025-06-18T00:21:32Z',
      },
      repository_url: 'https://github.com/modelcontextprotocol/servers',
      tags: ['time', 'timezone', 'conversions'],
    },
    {
      name: 'slack',
      image: 'mcp/slack:latest',
      description:
        'MCP Server for the Slack API, enabling Claude to interact with Slack workspaces',
      transport: 'stdio',
      permissions: {
        network: {
          outbound: {
            allow_host: ['api.slack.com', 'slack.com'],
            allow_port: [443],
          },
        },
      },
      tools: [
        'slack_list_channels',
        'slack_post_message',
        'slack_reply_to_thread',
        'slack_add_reaction',
        'slack_get_channel_history',
        'slack_get_thread_replies',
        'slack_get_users',
        'slack_get_user_profile',
      ],
      env_vars: [
        {
          name: 'SLACK_BOT_TOKEN',
          description: 'Bot User OAuth Token that starts with xoxb-',
          required: true,
          secret: true,
        },
        {
          name: 'SLACK_TEAM_ID',
          description: 'Slack Team ID that starts with T',
          required: true,
        },
      ],
      args: [],
      metadata: {
        stars: 54338,
        last_updated: '2025-06-18T00:21:30Z',
      },
      repository_url: 'https://github.com/modelcontextprotocol/servers',
      tags: ['slack', 'api', 'messaging'],
    },
    {
      name: 'osv',
      image: 'ghcr.io/stacklok/osv-mcp/server:latest',
      description:
        'An MCP server that provides access to the OSV (Open Source Vulnerabilities) database.',
      transport: 'sse',
      permissions: {
        network: {
          outbound: {
            allow_host: ['api.osv.dev'],
            allow_port: [443],
          },
        },
      },
      tools: [
        'query_vulnerability',
        'query_vulnerabilities_batch',
        'get_vulnerability',
      ],
      env_vars: [],
      args: [],
      metadata: {
        stars: 5,
        last_updated: '2025-06-18T00:21:30Z',
      },
      repository_url: 'https://github.com/stacklok/osv-mcp',
      tags: ['vulnerability', 'security', 'osv'],
      provenance: {
        sigstore_url: 'tuf-repo-cdn.sigstore.dev',
        repository_uri: 'https://github.com/stacklok/osv-mcp',
        repository_ref: '',
        signer_identity: '/.github/workflows/release.yml',
        runner_environment: 'github-hosted',
        cert_issuer: 'https://token.actions.githubusercontent.com',
      },
    },
  ],
  remote_servers: [],
})
