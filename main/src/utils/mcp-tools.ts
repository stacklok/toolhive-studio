import {
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClientConfig as MCPClientConfig,
  type Tool,
} from 'ai'
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { CoreWorkload } from '@api/types.gen'
import log from '../logger'

/**
 * Determines if the platform is probably using native containers.
 * Native containers mean Docker runs directly on the host OS (Linux),
 * as opposed to running in a VM (macOS/Windows with Docker Desktop).
 * When native containers are used, host networking mode allows direct
 * access to the host's network stack.
 */
function isProbablyUsingNativeContainers(): boolean {
  return process.platform === 'linux'
}

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
      // On platforms with native containers (Linux), use fixed port for mcp-optimizer
      // to work around thv port management bugs in host networking mode
      const useFixedPort =
        isProbablyUsingNativeContainers() &&
        workload.name === 'internal---meta-mcp'
      const port = useFixedPort ? 50051 : workload.port
      const url = new URL(`http://localhost:${port}/mcp`)
      return {
        name: workload.name,
        transport: new StreamableHTTPClientTransport(url),
      }
    },
    sse: () => ({
      name: workload.name,
      transport: {
        type: 'sse' as const,
        url: `${`http://localhost:${workload.port}/sse#${workload.name}`}`,
      },
    }),
    default: () => ({
      name: workload.name,
      transport: {
        type: 'sse' as const,
        url: `${`http://localhost:${workload.port}/sse#${workload.name}`}`,
      },
    }),
  }

  // Check if transport_type is stdio but URL suggests SSE
  let transportType = workload.transport_type as keyof typeof transportConfigs

  if (transportType === 'stdio' && workload.url) {
    // If URL contains /sse or #, use SSE transport instead
    if (workload.url.includes('/sse')) {
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
    const config = createTransport(workload)
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
    throw error
  }
}
