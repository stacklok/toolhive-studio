import {
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClientConfig as MCPClientConfig,
} from '@ai-sdk/mcp'
import { type Tool } from 'ai'
import { Experimental_StdioMCPTransport as StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
import log from '../logger'

export interface McpToolDefinition {
  description?: string
  inputSchema: Tool['inputSchema']
}

/**
 * Normalize a JSON Schema in place for Gemini's stricter validator. Drops
 * non-string `enum`s (Gemini allows `enum` only on strings) and collapses
 * union `type` arrays to a single type (`'null'` becomes `nullable: true`),
 * both of which Gemini otherwise rejects.
 */
export function sanitizeMcpJsonSchema(node: unknown): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) sanitizeMcpJsonSchema(item)
    return
  }
  const obj = node as Record<string, unknown>
  if (
    Array.isArray(obj.enum) &&
    !obj.enum.every((value) => typeof value === 'string')
  ) {
    delete obj.enum
  }
  if (Array.isArray(obj.type)) {
    const types = obj.type.filter(
      (t): t is string => typeof t === 'string' && t !== 'null'
    )
    if (obj.type.includes('null')) obj.nullable = true
    obj.type = types[0] ?? 'string'
  }
  for (const key of Object.keys(obj)) sanitizeMcpJsonSchema(obj[key])
}

/** Sanitize a tool's JSON Schema, whether wrapped (`inputSchema.jsonSchema`)
 * or bare (`inputSchema`). Mutates in place; safe on any tool. */
export function sanitizeToolInputSchema(tool: unknown): void {
  if (!tool || typeof tool !== 'object') return
  const inputSchema = (tool as { inputSchema?: unknown }).inputSchema
  if (!inputSchema || typeof inputSchema !== 'object') return
  const wrapped = (inputSchema as { jsonSchema?: unknown }).jsonSchema
  if (wrapped && typeof wrapped === 'object') {
    sanitizeMcpJsonSchema(wrapped)
  } else {
    sanitizeMcpJsonSchema(inputSchema)
  }
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
