import {
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClient as MCPClient,
  type experimental_MCPClientConfig as MCPClientConfig,
} from 'ai'
import type { ToolSet } from 'ai'
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { createClient } from '@api/client'
import { getApiV1BetaWorkloads } from '@api/sdk.gen'
import type { CoreWorkload } from '@api/types.gen'
import { getHeaders } from '../headers'
import { getToolhivePort } from '../toolhive-manager'
import log from '../logger'
import type { McpToolInfo } from './types'
import { getEnabledMcpTools } from './storage'

// Interface for MCP tool definition from client
interface McpToolDefinition {
  description?: string
  inputSchema?: {
    properties?: Record<string, unknown>
  }
}

// Type guard to check if an object is a valid MCP tool definition
function isMcpToolDefinition(obj: unknown): obj is McpToolDefinition {
  if (!obj || typeof obj !== 'object') return false

  const tool = obj as Record<string, unknown>

  // Description should be string if present
  if ('description' in tool && typeof tool.description !== 'string')
    return false

  // InputSchema should be object if present
  if ('inputSchema' in tool) {
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') return false

    const inputSchema = tool.inputSchema as Record<string, unknown>
    if (
      'properties' in inputSchema &&
      inputSchema.properties !== null &&
      typeof inputSchema.properties !== 'object'
    ) {
      return false
    }
  }

  return true
}

// Create transport configuration based on workload type
function createTransport(
  workload: CoreWorkload,
  serverName: string,
  port: number
): MCPClientConfig {
  const transportConfigs = {
    stdio: () => ({
      name: serverName,
      transport: new StdioMCPTransport({
        command: 'node',
        args: [],
      }),
    }),
    'streamable-http': () => {
      const url = new URL(workload.url || `http://localhost:${port}/mcp`)
      return {
        name: serverName,
        transport: new StreamableHTTPClientTransport(url),
      }
    },
    sse: () => ({
      name: serverName,
      transport: {
        type: 'sse' as const,
        url: `${workload.url || `http://localhost:${port}/sse#${serverName}`}`,
      },
    }),
    default: () => ({
      name: serverName,
      transport: {
        type: 'sse' as const,
        url: `${workload.url || `http://localhost:${port}/sse#${serverName}`}`,
      },
    }),
  }

  // Check if transport_type is stdio but URL suggests SSE
  let transportType = workload.transport_type as keyof typeof transportConfigs

  if (transportType === 'stdio' && workload.url) {
    // If URL contains /sse or #, use SSE transport instead
    if (workload.url.includes('/sse') || workload.url.includes('#')) {
      // Override stdio to SSE based on URL pattern
      transportType = 'sse'
    }
  }

  const configBuilder =
    transportConfigs[transportType] || transportConfigs.default
  return configBuilder()
}

// Get MCP server tools information
export async function getMcpServerTools(serverName?: string): Promise<
  | McpToolInfo[]
  | {
      serverName: string
      serverPackage?: string
      tools: Array<{
        name: string
        description?: string
        parameters?: Record<string, unknown>
        enabled: boolean
      }>
      isRunning: boolean
    }
  | null
> {
  try {
    const port = getToolhivePort()
    const client = createClient({
      baseUrl: `http://localhost:${port}`,
      headers: getHeaders(),
    })

    const { data } = await getApiV1BetaWorkloads({
      client,
    })
    const workloads = data?.workloads

    // If serverName is provided, return server-specific format
    if (serverName) {
      // Get server tools for specific server

      const workload = (workloads || []).find(
        (w) => w.name === serverName && w.tool_type === 'mcp'
      )

      if (!workload) {
        return null
      }

      // Get enabled tools for this server
      const enabledTools = getEnabledMcpTools()
      const enabledToolNames = enabledTools[serverName] || []

      // If workload.tools is empty, try to discover tools by connecting to the server
      let discoveredTools: string[] = workload.tools || []
      const serverMcpTools: Record<string, McpToolDefinition> = {}

      if (discoveredTools.length === 0 && workload.status === 'running') {
        try {
          // Try to create an MCP client and discover tools
          const config = createTransport(workload, serverName, port!)
          if (config) {
            const mcpClient = await createMCPClient(config)
            const rawTools = await mcpClient.tools()

            // Filter and validate tools using type guard
            for (const [toolName, toolDef] of Object.entries(rawTools)) {
              if (isMcpToolDefinition(toolDef)) {
                serverMcpTools[toolName] = toolDef
              }
            }

            discoveredTools = Object.keys(serverMcpTools)
            await mcpClient.close()
          }
        } catch (error) {
          log.error(`Failed to discover tools for ${serverName}:`, error)
        }
      }

      const result = {
        serverName: workload.name!,
        serverPackage: workload.package,
        tools: discoveredTools.map((toolName) => {
          const toolDef = serverMcpTools[toolName]
          return {
            name: toolName,
            description: toolDef?.description || '',
            parameters: toolDef?.inputSchema?.properties || {},
            enabled: enabledToolNames.includes(toolName),
          }
        }),
        isRunning: workload.status === 'running',
      }

      return result
    }

    // Otherwise return the original format for backward compatibility
    const mcpTools = (workloads || [])
      .filter(
        (workload) =>
          workload.name && workload.tools && workload.tool_type === 'mcp'
      )
      .flatMap((workload) =>
        workload.tools!.map((toolName) => ({
          name: `mcp_${workload.name}_${toolName}`,
          description: '',
          inputSchema: {},
          serverName: workload.name!,
        }))
      )

    return mcpTools
  } catch (error) {
    log.error('Failed to get MCP server tools:', error)
    return serverName ? null : []
  }
}

// Create MCP tools for AI SDK
export async function createMcpTools(): Promise<{
  tools: ToolSet
  clients: MCPClient[]
}> {
  const mcpTools: ToolSet = {}
  const mcpClients: MCPClient[] = []

  try {
    const port = getToolhivePort()
    const client = createClient({
      baseUrl: `http://localhost:${port}`,
      headers: getHeaders(),
    })

    const { data } = await getApiV1BetaWorkloads({
      client,
    })
    const workloads = data?.workloads

    // Get enabled tools from storage
    const enabledTools = getEnabledMcpTools()

    if (Object.keys(enabledTools).length === 0) {
      return { tools: mcpTools, clients: mcpClients }
    }

    // Create MCP clients for each server with enabled tools
    for (const [serverName, toolNames] of Object.entries(enabledTools)) {
      if (toolNames.length === 0) continue

      const workload = workloads?.find((w) => w.name === serverName)
      if (!workload || workload.tool_type !== 'mcp') continue

      try {
        const config = createTransport(workload, serverName, port!)

        const mcpClient = await createMCPClient(config)

        mcpClients.push(mcpClient)

        // Get all tools from the MCP server using schema discovery
        const serverMcpTools = await mcpClient.tools()

        // Add only the enabled tools from this server
        for (const toolName of toolNames) {
          if (serverMcpTools[toolName]) {
            mcpTools[toolName] = serverMcpTools[toolName]
          }
        }

        // MCP client created successfully
      } catch (error) {
        log.error(`Failed to create MCP client for ${serverName}:`, error)
      }
    }

    // MCP tools created
  } catch (error) {
    log.error('Failed to create MCP tools:', error)
  }

  return { tools: mcpTools, clients: mcpClients }
}
