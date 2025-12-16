import {
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClientConfig as MCPClientConfig,
} from '@ai-sdk/mcp'
import { type Tool } from 'ai'
import { Experimental_StdioMCPTransport as StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { CoreWorkload } from '@api/types.gen'
import log from '../logger'

export interface McpToolDefinition {
  description?: string
  inputSchema: Tool['inputSchema']
}

export function isMcpToolDefinition(obj: unknown): obj is McpToolDefinition {
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

export function createTransport(workload: CoreWorkload): MCPClientConfig {
  const transportConfigs = {
    stdio: () => ({
      name: workload.name,
      transport: new StdioMCPTransport({
        command: 'node',
        args: [],
      }),
    }),
    'streamable-http': () => {
      // ToolHive provides the correct URL with path in workload.url
      // Fallback to /mcp for local containers if url is missing
      const urlString = workload.url || `http://localhost:${workload.port}/mcp`
      return {
        name: workload.name,
        transport: new StreamableHTTPClientTransport(new URL(urlString)),
      }
    },
    sse: () => ({
      name: workload.name,
      transport: {
        type: 'sse' as const,
        url: `http://localhost:${workload.port}/sse#${workload.name}`,
      },
    }),
    default: () => ({
      name: workload.name,
      transport: {
        type: 'sse' as const,
        url: `http://localhost:${workload.port}/sse#${workload.name}`,
      },
    }),
  }

  // For stdio transport, ToolHive exposes the server via a proxy (SSE or streamable-http)
  // Check proxy_mode or URL pattern to determine the actual transport to use
  let transportType = workload.transport_type as keyof typeof transportConfigs

  if (transportType === 'stdio') {
    // Use proxy_mode if available, otherwise check URL pattern
    if (workload.proxy_mode === 'streamable-http') {
      transportType = 'streamable-http'
    } else if (
      workload.proxy_mode === 'sse' ||
      workload.url?.includes('/sse')
    ) {
      transportType = 'sse'
    }
  }

  const configBuilder =
    transportConfigs[transportType] || transportConfigs.default
  return configBuilder()
}

// Get available tools from a workload
export async function getWorkloadAvailableTools(
  workload: CoreWorkload
): Promise<Record<string, McpToolDefinition> | null> {
  if (!workload.name) return null

  try {
    // Try to create an MCP client and discover tools
    const config = createTransport(workload)
    if (config) {
      const mcpClient = await createMCPClient(config)
      const rawTools = await mcpClient.tools<'automatic'>()

      // Filter and validate tools using type guard
      const serverMcpTools = Object.entries(rawTools)
        .filter(([, defTool]) => isMcpToolDefinition(defTool))
        .reduce<Record<string, McpToolDefinition>>((prev, [name, def]) => {
          if (!def || !name) return prev
          prev[name] = {
            description: def.description,
            inputSchema: def.inputSchema as Tool['inputSchema'],
          }
          return prev
        }, {})
      await mcpClient.close()
      return serverMcpTools
    }
    return null
  } catch (error) {
    log.error(`Failed to discover tools for ${workload.name}:`, error)
    throw error
  }
}
