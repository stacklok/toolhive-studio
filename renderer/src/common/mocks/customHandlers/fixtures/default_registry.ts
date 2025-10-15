import type { V1GetRegistryResponse } from '@api/types.gen'

export const DEFAULT_REGISTRY = {
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
        tools: [
          'confluence_search',
          'confluence_get_page',
          'confluence_get_page_children',
          'confluence_get_comments',
          'confluence_get_labels',
          'confluence_add_label',
          'confluence_create_page',
          'confluence_update_page',
          'confluence_delete_page',
          'confluence_add_comment',
          'confluence_search_user',
          'jira_get_user_profile',
          'jira_get_issue',
          'jira_search',
          'jira_search_fields',
          'jira_get_project_issues',
          'jira_get_transitions',
          'jira_get_worklog',
          'jira_download_attachments',
          'jira_get_agile_boards',
          'jira_get_board_issues',
          'jira_get_sprints_from_board',
          'jira_get_sprint_issues',
          'jira_get_link_types',
          'jira_create_issue',
          'jira_batch_create_issues',
          'jira_batch_get_changelogs',
          'jira_update_issue',
          'jira_delete_issue',
          'jira_add_comment',
          'jira_add_worklog',
          'jira_link_to_epic',
          'jira_create_issue_link',
          'jira_remove_issue_link',
          'jira_transition_issue',
          'jira_create_sprint',
          'jira_update_sprint',
          'jira_get_project_versions',
          'jira_get_all_projects',
          'jira_create_version',
          'jira_batch_create_versions',
        ],
        env_vars: [
          {
            name: 'CONFLUENCE_URL',
            description:
              'Confluence URL (e.g., https://your-domain.atlassian.net/wiki)',
            required: false,
          },
          {
            name: 'CONFLUENCE_USERNAME',
            description: 'Confluence username/email for Cloud deployments',
            required: false,
          },
          {
            name: 'CONFLUENCE_API_TOKEN',
            description: 'Confluence API token for Cloud deployments',
            required: false,
            secret: true,
          },
          {
            name: 'CONFLUENCE_PERSONAL_TOKEN',
            description:
              'Confluence Personal Access Token for Server/Data Center deployments',
            required: false,
            secret: true,
          },
          {
            name: 'CONFLUENCE_SSL_VERIFY',
            description:
              'Verify SSL certificates for Confluence Server/Data Center (true/false)',
            required: false,
          },
          {
            name: 'CONFLUENCE_SPACES_FILTER',
            description:
              'Comma-separated list of Confluence space keys to filter search results',
            required: false,
          },
          {
            name: 'JIRA_URL',
            description: 'Jira URL (e.g., https://your-domain.atlassian.net)',
            required: false,
          },
          {
            name: 'JIRA_USERNAME',
            description: 'Jira username/email for Cloud deployments',
            required: false,
          },
          {
            name: 'JIRA_API_TOKEN',
            description: 'Jira API token for Cloud deployments',
            required: false,
            secret: true,
          },
          {
            name: 'JIRA_PERSONAL_TOKEN',
            description:
              'Jira Personal Access Token for Server/Data Center deployments',
            required: false,
            secret: true,
          },
          {
            name: 'JIRA_SSL_VERIFY',
            description:
              'Verify SSL certificates for Jira Server/Data Center (true/false)',
            required: false,
          },
          {
            name: 'JIRA_PROJECTS_FILTER',
            description:
              'Comma-separated list of Jira project keys to filter search results',
            required: false,
          },
          {
            name: 'READ_ONLY_MODE',
            description:
              'Run in read-only mode (disables all write operations)',
            required: false,
          },
          {
            name: 'MCP_VERBOSE',
            description: 'Increase logging verbosity',
            required: false,
          },
          {
            name: 'ENABLED_TOOLS',
            description:
              'Comma-separated list of tool names to enable (if not set, all tools are enabled)',
            required: false,
          },
        ],
        args: [],
        metadata: {
          stars: 2692,
          pulls: 11969,
          last_updated: '2025-08-06T00:24:12Z',
        },
        repository_url: 'https://github.com/sooperset/mcp-atlassian',
        tags: [
          'atlassian',
          'confluence',
          'jira',
          'wiki',
          'issue-tracking',
          'project-management',
          'documentation',
          'cloud',
          'server',
          'data-center',
        ],
      },
      'aws-cost-analysis': {
        name: 'aws-cost-analysis',
        image: 'public.ecr.aws/f3y8w4n0/awslabs/cost-analysis-mcp-server:1.0.4',
        description:
          'Generate upfront AWS service cost estimates and cost insights. This server is deprecated, use aws-pricing instead.',
        tier: 'Official',
        status: 'Deprecated',
        transport: 'stdio',
        permissions: {
          network: {
            outbound: {
              allow_host: [
                'aws.amazon.com',
                'pricing.us-east-1.amazonaws.com',
                'api.pricing.us-east-1.amazonaws.com',
                'api.pricing.eu-central-1.amazonaws.com',
                'api.pricing.ap-southeast-1.amazonaws.com',
              ],
              allow_port: [443],
            },
          },
        },
        tools: [
          'analyze_cdk_project',
          'analyze_terraform_project',
          'get_pricing_from_web',
          'get_pricing_from_api',
          'get_bedrock_patterns',
          'generate_cost_report',
        ],
        env_vars: [
          {
            name: 'AWS_ACCESS_KEY_ID',
            description: 'AWS access key ID with access to the AWS Pricing API',
            required: false,
            secret: true,
          },
          {
            name: 'AWS_SECRET_ACCESS_KEY',
            description: 'AWS secret access key',
            required: false,
            secret: true,
          },
          {
            name: 'AWS_SESSION_TOKEN',
            description: 'AWS session token for temporary credentials',
            required: false,
            secret: true,
          },
          {
            name: 'AWS_REGION',
            description:
              'AWS region for the Pricing API endpoint (us-east-1, eu-central-1, ap-southeast-1)',
            required: false,
            default: 'us-east-1',
          },
          {
            name: 'FASTMCP_LOG_LEVEL',
            description:
              'Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)',
            required: false,
            default: 'ERROR',
          },
        ],
        args: [],
        metadata: {
          stars: 5207,
          pulls: 7763,
          last_updated: '2025-08-06T00:24:26Z',
        },
        repository_url: 'https://github.com/awslabs/mcp',
        tags: [
          'aws',
          'cost-analysis',
          'pricing',
          'estimates',
          'cost-insights',
          'aws-costs',
          'aws-pricing',
        ],
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
              pulls: 11969,
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
} as const satisfies V1GetRegistryResponse
