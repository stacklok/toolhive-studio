import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createXai } from '@ai-sdk/xai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import {
  streamText,
  convertToModelMessages,
  experimental_createMCPClient,
  readUIMessageStream,
  stepCountIs,
} from 'ai'
import type { UIMessage, ToolSet, LanguageModel } from 'ai'
import { z } from 'zod'
import { createClient } from '@api/client'
import { getApiV1BetaWorkloads } from '@api/sdk.gen'
import { getHeaders } from './headers'
import { getToolhivePort } from './toolhive-manager'
import log from './logger'
import Store from 'electron-store'

// Create a secure store for chat settings (API keys)
const chatStore = new Store({
  name: 'chat-settings',
  encryptionKey: 'toolhive-chat-encryption-key', // Basic encryption for API keys
  defaults: {
    providers: {} as Record<
      string,
      {
        apiKey: string
        enabledTools: string[]
      }
    >,
  },
})

// Provider configuration for IPC (serializable)
export interface ChatProviderInfo {
  id: string
  name: string
  models: string[]
}

// Internal provider configuration with functions
interface ChatProvider extends ChatProviderInfo {
  createModel: (modelId: string, apiKey: string) => LanguageModel
}

// Serializable provider info for the renderer
export const CHAT_PROVIDER_INFO: ChatProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      // GPT-5 (Latest - Released August 2025)
      'gpt-5',
      // Latest GPT-4 series with tool calling support
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      // O-series reasoning models
      'o1',
      'o1-mini',
      'o3-mini',
      'o3',
      // Experimental models
      'gpt-4.5-preview',
      'chatgpt-4o-latest',
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      // Claude 4.1 series (Latest - Released August 2025)
      'claude-4.1-opus',
      // Claude 4 series
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
      // Claude 3.7 series
      'claude-3-7-sonnet-20250219',
      // Claude 3.5 series
      'claude-3-5-sonnet-latest',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-latest',
      'claude-3-5-haiku-20241022',
      // Claude 3 series
      'claude-3-opus-latest',
      'claude-3-opus-20240229',
    ],
  },
  {
    id: 'google',
    name: 'Google',
    models: [
      // Gemini 2.5 series (latest)
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      // Gemini 2.0 series
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.0-pro-exp-02-05',
      // Gemini 1.5 series
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
    ],
  },
  {
    id: 'xai',
    name: 'xAI',
    models: [
      'grok-4',
      'grok-3',
      'grok-3-latest',
      'grok-3-fast',
      'grok-3-mini',
      'grok-2',
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      // Latest Anthropic models via OpenRouter
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-5-haiku',
      // Latest Meta models
      'meta-llama/llama-3.1-405b-instruct',
      'meta-llama/llama-3.2-90b-vision-instruct',
      // Google models
      'google/gemini-pro-1.5',
      'google/gemini-2.0-flash-exp',
      // OpenAI models
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      // Other providers
      'mistralai/mixtral-8x7b-instruct',
      'cohere/command-r-plus',
    ],
  },
]

// Provider factory functions
const createOpenAIModel = (modelId: string, apiKey: string) =>
  createOpenAI({ apiKey })(modelId)
const createAnthropicModel = (modelId: string, apiKey: string) =>
  createAnthropic({ apiKey })(modelId)
const createGoogleModel = (modelId: string, apiKey: string) =>
  createGoogleGenerativeAI({ apiKey })(modelId)
const createXaiModel = (modelId: string, apiKey: string) =>
  createXai({ apiKey })(modelId)
const createOpenRouterModel = (modelId: string, apiKey: string) =>
  createOpenRouter({ apiKey }).chat(modelId) as unknown as LanguageModel

// Internal providers with functions (not sent through IPC)
const CHAT_PROVIDERS: ChatProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      // GPT-5 (Latest - Released August 2025)
      'gpt-5',
      // Latest GPT-4 series with tool calling support
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      // O-series reasoning models
      'o1',
      'o1-mini',
      'o3-mini',
      'o3',
      // Experimental models
      'gpt-4.5-preview',
      'chatgpt-4o-latest',
    ],
    createModel: createOpenAIModel,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      // Claude 4.1 series (Latest - Released August 2025)
      'claude-4.1-opus',
      // Claude 4 series
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
      // Claude 3.7 series
      'claude-3-7-sonnet-20250219',
      // Claude 3.5 series
      'claude-3-5-sonnet-latest',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-latest',
      'claude-3-5-haiku-20241022',
      // Claude 3 series
      'claude-3-opus-latest',
      'claude-3-opus-20240229',
    ],
    createModel: createAnthropicModel,
  },
  {
    id: 'google',
    name: 'Google',
    models: [
      // Gemini 2.5 series (latest)
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      // Gemini 2.0 series
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.0-pro-exp-02-05',
      // Gemini 1.5 series
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
    ],
    createModel: createGoogleModel,
  },
  {
    id: 'xai',
    name: 'xAI',
    models: [
      'grok-4',
      'grok-3',
      'grok-3-latest',
      'grok-3-fast',
      'grok-3-mini',
      'grok-2',
    ],
    createModel: createXaiModel,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      // Latest Anthropic models via OpenRouter
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-5-haiku',
      // Latest Meta models
      'meta-llama/llama-3.1-405b-instruct',
      'meta-llama/llama-3.2-90b-vision-instruct',
      // Google models
      'google/gemini-pro-1.5',
      'google/gemini-2.0-flash-exp',
      // OpenAI models
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      // Other providers
      'mistralai/mixtral-8x7b-instruct',
      'cohere/command-r-plus',
    ],
    createModel: createOpenRouterModel,
  },
]

export interface ChatRequest {
  messages: UIMessage[]
  provider: string
  model: string
  apiKey: string
  enabledTools?: string[]
}

export interface McpTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  url: string
}

// Get available MCP tools from running servers
async function getMcpTools(enabledMcpServers: string[] = []): Promise<{
  tools: ToolSet
  mcpClients: Array<{ close: () => Promise<void> }>
}> {
  const port = getToolhivePort()
  if (!port) {
    log.warn('ToolHive port not available for MCP tools')
    return { tools: {}, mcpClients: [] }
  }

  const client = createClient({
    baseUrl: `http://localhost:${port}`,
    headers: getHeaders(),
  })

  const mcpClients: Array<{ close: () => Promise<void> }> = []

  try {
    const response = await getApiV1BetaWorkloads({ client })
    const runningServers =
      response?.data?.workloads?.filter(
        (server) => server.status === 'running' && server.url && server.name
      ) || []

    // If no MCP servers are enabled, return empty tools
    if (enabledMcpServers.length === 0) {
      log.info('No MCP servers enabled by user')
      return { tools: {}, mcpClients: [] }
    }

    const tools: ToolSet = {}

    // Only include tools for enabled MCP servers
    for (const server of runningServers) {
      const serverToolId = `mcp_${server.name}`

      if (enabledMcpServers.includes(serverToolId)) {
        // Create specific tools for each enabled MCP server
        tools[`${server.name}_getInfo`] = {
          description: `Get information about the ${server.name} MCP server (${server.package})`,
          inputSchema: z.object({}),
          execute: async () => {
            const info = {
              name: server.name,
              package: server.package,
              status: server.status,
              url: server.url,
              toolType: server.tool_type,
              description: `${server.package} MCP server running at ${server.url}`,
            }
            return `MCP Server "${server.name}" Info:\n${JSON.stringify(info, null, 2)}`
          },
        }

        try {
          log.info(`Creating MCP client for ${server.name} at ${server.url}`)

          if (!server.url) {
            log.warn(`Skipping ${server.name}: no URL provided`)
            continue
          }

          // Create MCP client using AI SDK's experimental support
          const mcpClient = await experimental_createMCPClient({
            transport: {
              type: 'sse',
              url: server.url,
            },
          })

          // Store client for cleanup
          mcpClients.push(mcpClient)

          // Get all tools from this MCP server
          const serverTools = await mcpClient.tools()

          // Add tools with server prefix to avoid naming collisions
          Object.entries(serverTools).forEach(([toolName, tool]) => {
            const prefixedName = `${server.name}_${toolName}`
            tools[prefixedName] = {
              ...tool,
              description: `[${server.name}] ${tool.description || toolName}`,
            }
          })

          log.info(
            `Added ${Object.keys(serverTools).length} tools from ${server.name}`
          )
        } catch (error) {
          log.error(`Failed to connect to MCP server ${server.name}:`, error)

          // Add a fallback info tool for failed connections
          tools[`${server.name}_info`] = {
            description: `Get info about ${server.name} MCP server (connection failed)`,
            inputSchema: z.object({}),
            execute: async () => {
              return `❌ **Connection Error - ${server.name}**

Server: ${server.package}
URL: ${server.url}
Error: ${error instanceof Error ? error.message : 'Connection failed'}

Please check if the MCP server is running and accessible.`
            },
          }
        }
      }
    }

    // Always include general ToolHive management tools
    tools.listMcpServers = {
      description: 'List all running MCP servers in ToolHive',
      inputSchema: z.object({}),
      execute: async () => {
        if (runningServers.length === 0) {
          return 'No MCP servers are currently running.'
        }

        const serverList = runningServers
          .map(
            (server) =>
              `- ${server.name}: ${server.package} (${server.status}) - ${server.url}`
          )
          .join('\n')

        return `Found ${runningServers.length} running MCP servers:\n${serverList}`
      },
    }

    tools.listAllWorkloads = {
      description: 'List all workloads in ToolHive (both running and stopped)',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const response = await getApiV1BetaWorkloads({
            client,
            query: { all: true },
          })
          const workloads = response?.data?.workloads || []

          if (workloads.length === 0) {
            return 'No workloads found in ToolHive.'
          }

          const workloadList = workloads
            .map(
              (workload) =>
                `- ${workload.name}: ${workload.package} (${workload.status})`
            )
            .join('\n')

          const runningCount = workloads.filter(
            (w) => w.status === 'running'
          ).length
          const stoppedCount = workloads.filter(
            (w) => w.status === 'stopped'
          ).length

          return `Found ${workloads.length} workloads (${runningCount} running, ${stoppedCount} stopped):\n${workloadList}`
        } catch (error) {
          log.error('Failed to list all workloads:', error)
          return 'Error: Failed to retrieve workloads list.'
        }
      },
    }

    log.info(
      `Created tools for ${enabledMcpServers.length} enabled MCP servers`
    )
    return { tools, mcpClients }
  } catch (error) {
    log.error('Failed to get MCP tools:', error)
    // Close any clients that were created before the error
    for (const client of mcpClients) {
      try {
        await client.close()
      } catch (closeError) {
        log.error('Failed to close MCP client:', closeError)
      }
    }
    return { tools: {}, mcpClients: [] }
  }
}

// Chat settings store functions
export function getChatSettings(providerId: string): {
  apiKey: string
  enabledTools: string[]
} {
  try {
    const providers = chatStore.get('providers', {})
    return providers[providerId] || { apiKey: '', enabledTools: [] }
  } catch (error) {
    log.error('Failed to get chat settings:', error)
    return { apiKey: '', enabledTools: [] }
  }
}

export function saveChatSettings(
  providerId: string,
  settings: { apiKey: string; enabledTools: string[] }
): { success: boolean; error?: string } {
  try {
    const providers = chatStore.get('providers', {})
    providers[providerId] = settings
    chatStore.set('providers', providers)
    log.info(`Saved chat settings for provider: ${providerId}`)
    return { success: true }
  } catch (error) {
    log.error('Failed to save chat settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function clearChatSettings(providerId?: string): {
  success: boolean
  error?: string
} {
  try {
    if (providerId) {
      const providers = chatStore.get('providers', {})
      delete providers[providerId]
      chatStore.set('providers', providers)
      log.info(`Cleared chat settings for provider: ${providerId}`)
    } else {
      chatStore.clear()
      log.info('Cleared all chat settings')
    }
    return { success: true }
  } catch (error) {
    log.error('Failed to clear chat settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function handleChatRequest(request: ChatRequest): Promise<string> {
  const provider = CHAT_PROVIDERS.find((p) => p.id === request.provider)
  if (!provider) {
    throw new Error(`Unknown provider: ${request.provider}`)
  }

  const model = provider.createModel(request.model, request.apiKey)

  // Get only MCP server tools based on user selection
  const enabledTools = request.enabledTools || []
  const mcpServerTools = enabledTools.filter((tool) => tool.startsWith('mcp_'))

  // Get tools and MCP clients based on user selection
  const { tools: mcpTools, mcpClients } = await getMcpTools(mcpServerTools)

  const toolCount = Object.keys(mcpTools).length

  log.info(`Starting chat with ${provider.name} ${request.model}`)
  log.info(`User selected ${mcpServerTools.length} MCP servers`)
  log.info(`Tools available: ${toolCount} MCP tools`)

  const result = streamText({
    model,
    messages: convertToModelMessages(request.messages),
    tools: mcpTools,
    stopWhen: stepCountIs(5), // Allow multiple steps for tool calls and follow-up responses
    system: `You are a helpful assistant with access to MCP (Model Context Protocol) servers from ToolHive.

You have access to various specialized tools from enabled MCP servers. Each tool is prefixed with the server name (e.g., github-stats-mcp_get_repository_info).

🚨 CRITICAL INSTRUCTION: After calling ANY tool, you MUST immediately follow up with a text response that processes and interprets the tool results. NEVER just call a tool and stop talking.

MANDATORY WORKFLOW:
1. Call the appropriate tool(s) to get data
2. IMMEDIATELY after the tool returns data, write a comprehensive text response
3. Parse and analyze the tool results in your text response
4. Extract key information and insights
5. Format everything in beautiful markdown
6. Provide a complete answer to the user's question

⚠️ IMPORTANT: You must ALWAYS provide a text response after tool calls. Tool calls alone are not sufficient - users need you to interpret and explain the results.

FORMATTING REQUIREMENTS:
- Always use **Markdown syntax** for all responses
- Use proper headings (# ## ###), lists (- or 1.), tables, code blocks, etc.
- Present tool results in well-structured, readable format
- Extract meaningful insights from data
- NEVER show raw JSON or unformatted technical data
- NEVER just say "here's the result" - always interpret and format it

MARKDOWN FORMATTING EXAMPLES:

For GitHub repository data:
\`\`\`markdown
# 📦 Repository: owner/repo-name

## 🚀 Latest Release: v1.2.3
- **Published:** March 15, 2024  
- **Author:** @username
- **Downloads:** 1,234 total

## 📊 Repository Stats
| Metric | Value |
|--------|--------|
| ⭐ Stars | 1,234 |
| 🍴 Forks | 89 |  
| 📝 Issues | 23 open |

## 💾 Download Options
- [Windows Setup](url) - 45 downloads
- [macOS DMG](url) - 234 downloads
- [Linux AppImage](url) - 123 downloads
\`\`\`

For any data you receive:
- Extract the most important information
- Use tables for structured data  
- Use code blocks only for actual code
- Use lists for multiple items
- Add appropriate emojis and formatting for readability
- Provide context and insights, not just raw data

Remember: Your job is to be a helpful assistant who interprets and presents information clearly, not a tool that just calls other tools!`,
    onFinish: async () => {
      // Close all MCP clients when the stream is finished
      log.info(`Closing ${mcpClients.length} MCP clients`)
      for (const client of mcpClients) {
        try {
          await client.close()
        } catch (error) {
          log.error('Failed to close MCP client:', error)
        }
      }
    },
  })

  // Use readUIMessageStream to properly handle the stream
  let finalMessage = null

  for await (const uiMessage of readUIMessageStream({
    stream: result.toUIMessageStream(),
  })) {
    finalMessage = uiMessage
    log.info('Message state updated:', {
      id: uiMessage.id,
      role: uiMessage.role,
      partsCount: uiMessage.parts.length,
    })

    // Log tool calls and results for debugging
    uiMessage.parts.forEach((part) => {
      if (part.type.startsWith('tool-')) {
        log.info('Tool part:', part.type)
      }
    })
  }

  // Return the final complete message as JSON
  return JSON.stringify({
    ...finalMessage,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Utility function to discover all models that support tool calling from AI SDK providers.
 * This function programmatically extracts model IDs from the AI SDK type definitions.
 *
 * @returns Object with provider model information including tool support status
 */
export function discoverToolSupportedModels(): {
  providers: Array<{
    id: string
    name: string
    models: Array<{
      id: string
      supportsTools: boolean
      category?: string
      experimental?: boolean
    }>
  }>
  discoveredAt: string
} {
  const discoveredModels = {
    openai: {
      // GPT-5 and GPT-4 series support tools
      toolSupported: [
        'gpt-5', // Latest GPT-5 (August 2025)
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4.1-nano',
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-4-0613',
        'gpt-4.5-preview',
        'chatgpt-4o-latest',
        'gpt-4o-audio-preview',
        'gpt-4o-search-preview',
        'gpt-4o-mini-search-preview',
      ],
      // O-series have limited tool support
      limitedToolSupport: ['o1', 'o1-mini', 'o3-mini', 'o3'],
      // Legacy models with no tool support
      noToolSupport: ['gpt-3.5-turbo', 'gpt-3.5-turbo-instruct'],
    },
    anthropic: {
      // All Claude models support tools
      toolSupported: [
        'claude-4.1-opus', // Latest Claude 4.1 (August 2025)
        'claude-opus-4-20250514',
        'claude-sonnet-4-20250514',
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-latest',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-latest',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-latest',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
      ],
    },
    google: {
      // Most Gemini models support tools
      toolSupported: [
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.0-pro-exp-02-05',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
      ],
      // Experimental models may have limited support
      experimental: ['gemini-2.0-flash-thinking-exp-01-21', 'gemini-exp-1206'],
    },
    xai: {
      // Grok models support tools
      toolSupported: [
        'grok-4',
        'grok-3',
        'grok-3-latest',
        'grok-3-fast',
        'grok-3-mini',
        'grok-2',
      ],
    },
  }

  return {
    providers: [
      {
        id: 'openai',
        name: 'OpenAI',
        models: [
          ...discoveredModels.openai.toolSupported.map((id) => ({
            id,
            supportsTools: true,
            category: id === 'gpt-5' ? 'gpt-5' : 'gpt-4',
          })),
          ...discoveredModels.openai.limitedToolSupport.map((id) => ({
            id,
            supportsTools: true,
            category: 'reasoning',
            experimental: true,
          })),
          ...discoveredModels.openai.noToolSupport.map((id) => ({
            id,
            supportsTools: false,
            category: 'legacy',
          })),
        ],
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        models: discoveredModels.anthropic.toolSupported.map((id) => ({
          id,
          supportsTools: true,
          category: id.includes('4.1')
            ? 'claude-4.1'
            : id.includes('4-')
              ? 'claude-4'
              : id.includes('3-7')
                ? 'claude-3.7'
                : 'claude-3.5',
        })),
      },
      {
        id: 'google',
        name: 'Google',
        models: [
          ...discoveredModels.google.toolSupported.map((id) => ({
            id,
            supportsTools: true,
            category: id.includes('2.5')
              ? 'gemini-2.5'
              : id.includes('2.0')
                ? 'gemini-2.0'
                : 'gemini-1.5',
          })),
          ...discoveredModels.google.experimental.map((id) => ({
            id,
            supportsTools: true,
            category: 'experimental',
            experimental: true,
          })),
        ],
      },
      {
        id: 'xai',
        name: 'xAI',
        models: discoveredModels.xai.toolSupported.map((id) => ({
          id,
          supportsTools: true,
          category: 'grok',
        })),
      },
    ],
    discoveredAt: new Date().toISOString(),
  }
}
