import type {
  GetApiV1BetaRegistryByNameResponse,
  GetApiV1BetaRegistryByNameData,
} from '@common/api/generated/types.gen'
import { AutoAPIMock } from '@mocks'
import { HttpResponse } from 'msw'

export const mockedGetApiV1BetaRegistryByName = AutoAPIMock<
  GetApiV1BetaRegistryByNameResponse,
  GetApiV1BetaRegistryByNameData
>({
  name: 'default',
  version: '1.0.0',
  last_updated: '2025-08-06T00:24:28Z',
  server_count: 2,
  registry: {
    version: '1.0.0',
    last_updated: '2025-08-06T00:24:28Z',
    servers: {
      atlassian: {
        name: 'atlassian',
        image: 'ghcr.io/sooperset/mcp-atlassian:latest',
        description:
          'Connect to Atlassian products like Confluence, Jira Cloud and Server/Data deployments.',
        tier: 'Community',
        status: 'Active',
        transport: 'stdio',
        permissions: {
          network: {
            outbound: {
              allow_host: ['.atlassian.net', '.atlassian.com'],
              allow_port: [443],
            },
          },
        },
        tools: ['confluence_search', 'jira_get_issue'],
        env_vars: [
          {
            name: 'CONFLUENCE_URL',
            description:
              'Confluence URL (e.g., https://your-domain.atlassian.net/wiki)',
            required: false,
          },
          {
            name: 'JIRA_API_TOKEN',
            description: 'Jira API token for Cloud deployments',
            required: false,
            secret: true,
          },
        ],
        args: [],
        metadata: {
          stars: 2692,
          last_updated: '2025-08-06T00:24:12Z',
        },
        repository_url: 'https://github.com/sooperset/mcp-atlassian',
        tags: ['atlassian', 'confluence', 'jira'],
      },
      'aws-cost-analysis': {
        name: 'aws-cost-analysis',
        image: 'public.ecr.aws/f3y8w4n0/awslabs/cost-analysis-mcp-server:1.0.4',
        description:
          'Generate upfront AWS service cost estimates and cost insights.',
        tier: 'Official',
        status: 'Deprecated',
        transport: 'stdio',
        permissions: {
          network: {
            outbound: {
              allow_host: ['aws.amazon.com', 'pricing.us-east-1.amazonaws.com'],
              allow_port: [443],
            },
          },
        },
        tools: ['analyze_cdk_project', 'get_pricing_from_api'],
        env_vars: [
          {
            name: 'AWS_ACCESS_KEY_ID',
            description: 'AWS access key ID with access to the AWS Pricing API',
            required: false,
            secret: true,
          },
          {
            name: 'AWS_REGION',
            description: 'AWS region for the Pricing API endpoint',
            required: false,
            default: 'us-east-1',
          },
        ],
        args: [],
        metadata: {
          stars: 5207,
          last_updated: '2025-08-06T00:24:26Z',
        },
        repository_url: 'https://github.com/awslabs/mcp',
        tags: ['aws', 'cost-analysis', 'pricing'],
      },
    },
    groups: [
      {
        name: 'dev-toolkit',
        description: 'Essential tools for development',
        servers: {
          atlassian: {
            name: 'atlassian',
            image: 'ghcr.io/sooperset/mcp-atlassian:latest',
            description:
              'Connect to Atlassian products like Confluence, Jira Cloud and Server/Data deployments.',
            tier: 'Community',
            status: 'Active',
            transport: 'stdio',
            permissions: {
              network: {
                outbound: {
                  allow_host: ['.atlassian.net', '.atlassian.com'],
                  allow_port: [443],
                },
              },
            },
            tools: ['confluence_search', 'jira_get_issue'],
            env_vars: [],
            args: [],
            metadata: {
              stars: 2692,
              last_updated: '2025-08-06T00:24:12Z',
            },
            repository_url: 'https://github.com/sooperset/mcp-atlassian',
            tags: ['atlassian', 'confluence', 'jira'],
          },
        },
        remote_servers: {},
      },
      {
        name: 'web-scraping',
        description: 'Tools for web scraping',
        servers: {},
        remote_servers: {},
      },
    ],
  },
}).scenario('server-error', (mock) =>
  mock.overrideHandler(() =>
    HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
  )
)
