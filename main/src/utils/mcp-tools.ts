import {
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClientConfig as MCPClientConfig,
  type Tool,
} from 'ai'
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { CoreWorkload } from '@api/types.gen'
import log from '../logger'

export interface McpToolDefinition {
  description?: string
  inputSchema: Tool['inputSchema']
}

export function isMcpToolDefinition(obj: Tool): obj is McpToolDefinition {
  if (!obj || typeof obj !== 'object' || obj === null) return false

  const tool = obj

  // Description should be string if present
  if (
    'description' in tool &&
    tool.description !== undefined &&
    typeof tool.description !== 'string'
  )
    return false

  // InputSchema should be object if present
  if ('inputSchema' in tool && tool.inputSchema !== undefined) {
    if (typeof tool.inputSchema !== 'object' || tool.inputSchema === null)
      return false

    const inputSchema = tool.inputSchema as Record<string, unknown>
    if ('properties' in inputSchema && inputSchema.properties !== undefined) {
      if (
        typeof inputSchema.properties !== 'object' ||
        inputSchema.properties === null ||
        Array.isArray(inputSchema.properties)
      ) {
        return false
      }
    }
  }

  return true
}

export function createTransport(
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

// Get available tools from a workload
export async function getWorkloadAvailableTools(workload: CoreWorkload) {
  if (!workload.name) return null

  try {
    // Try to create an MCP client and discover tools
    const config = createTransport(workload, workload.name, workload.port!)
    if (config) {
      const mcpClient = await createMCPClient(config)
      const rawTools = await mcpClient.tools<'automatic'>()

      // Filter and validate tools using type guard, creating serializable copies
      const serverMcpTools = Object.entries(rawTools)
        .filter(([, defTool]) => isMcpToolDefinition(defTool))
        .reduce<Record<string, McpToolDefinition>>((prev, [name, def]) => {
          if (!def || !name) return prev
          prev[name] = {
            description: def.description ?? '',
            inputSchema: def.inputSchema ?? undefined,
          }
          return prev
        }, {})
      await mcpClient.close()
      return serverMcpTools
    }
  } catch (error) {
    log.error(`Failed to discover tools for ${workload.name}:`, error)
    return {}
  }
}
