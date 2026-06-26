import {
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClientConfig as MCPClientConfig,
} from '@ai-sdk/mcp'
import { type Tool } from 'ai'
import { Experimental_StdioMCPTransport as StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
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
      // Use the AI SDK's transport config form (not a transport instance).
      // `@ai-sdk/mcp` >=1.0.42 assigns to `transport.protocolVersion` after
      // `initialize`, but `StreamableHTTPClientTransport` from
      // `@modelcontextprotocol/sdk` exposes `protocolVersion` as a
      // getter-only property and throws TypeError on assignment in strict
      // mode, breaking tool discovery for every streamable-http server.
      return {
        name: workload.name,
        transport: {
          type: 'http' as const,
          url: urlString,
        },
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

/**
 * Builds a raw SDK `Transport` for a workload. Unlike `createTransport`, this
 * returns a concrete transport instance suitable for `Client.connect()` from
 * `@modelcontextprotocol/sdk` rather than the AI SDK client config shape.
 */
export function buildRawTransport(workload: CoreWorkload): Transport {
  const config = createTransport(workload)
  const { transport } = config
  // `createTransport` returns AI SDK config shapes (`{ type: 'http' | 'sse',
  // url }`) for HTTP-based transports. Materialize them into the raw SDK
  // transport instances expected by `Client.connect()`.
  const cfgTransport = transport as {
    type?: string
    url?: string | URL
  }
  if (cfgTransport.type === 'http' && cfgTransport.url) {
    const url =
      cfgTransport.url instanceof URL
        ? cfgTransport.url
        : new URL(cfgTransport.url)
    return new StreamableHTTPClientTransport(url)
  }
  if (cfgTransport.type === 'sse' && cfgTransport.url) {
    const url =
      cfgTransport.url instanceof URL
        ? cfgTransport.url
        : new URL(cfgTransport.url)
    return new SSEClientTransport(url)
  }
  throw new Error(
    `Unsupported raw transport for workload ${workload.name ?? 'unknown'}`
  )
}

// Get available tools from a workload
export async function getWorkloadAvailableTools(
  workload: CoreWorkload
): Promise<Record<string, McpToolDefinition> | null> {
  if (!workload.name) return null

  try {
    if (
      workload.transport_type === 'stdio' &&
      workload.proxy_mode === 'streamable-http'
    ) {
      const mcpClient = new Client({
        name: 'toolhive-studio-tool-discovery',
        version: '1.0.0',
      })

      try {
        await mcpClient.connect(buildRawTransport(workload))
        const rawTools = await mcpClient.listTools()

        return rawTools.tools
          .filter((tool) => isMcpToolDefinition(tool))
          .reduce<Record<string, McpToolDefinition>>((prev, tool) => {
            if (!tool.name) return prev
            prev[tool.name] = {
              description: tool.description,
              inputSchema: tool.inputSchema as Tool['inputSchema'],
            }
            return prev
          }, {})
      } finally {
        await mcpClient.close()
      }
    }

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
