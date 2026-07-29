import {
  Client,
  SSEClientTransport,
  StreamableHTTPClientTransport,
  type ClientOptions,
  type Transport,
} from '@modelcontextprotocol/client'
import { jsonSchema, type Tool } from 'ai'
import type { CoreWorkload } from '@common/api/generated/types.gen'
import log from '../logger'

export interface McpToolDefinition {
  description?: string
  inputSchema: Tool['inputSchema']
  _meta?: Record<string, unknown>
}

export const MCP_UI_EXTENSION_CAPABILITY = {
  'io.modelcontextprotocol/ui': {
    mimeTypes: ['text/html;profile=mcp-app'],
  },
}

export interface ConnectWorkloadMcpClientOptions {
  clientName?: string
  capabilities?: ClientOptions['capabilities']
}

export interface ConnectedMcpClient {
  client: Client
  close: () => Promise<void>
}

export function isMcpToolDefinition(obj: unknown): obj is McpToolDefinition {
  if (!obj || typeof obj !== 'object' || obj === null) return false

  const tool = obj as Record<string, unknown>

  if (
    'description' in tool &&
    tool.description !== undefined &&
    typeof tool.description !== 'string'
  ) {
    return false
  }

  if ('inputSchema' in tool && tool.inputSchema !== undefined) {
    if (typeof tool.inputSchema !== 'object' || tool.inputSchema === null) {
      return false
    }

    const inputSchema = tool.inputSchema as Record<string, unknown>
    const schemaBody =
      'jsonSchema' in inputSchema && inputSchema.jsonSchema
        ? (inputSchema.jsonSchema as Record<string, unknown>)
        : inputSchema

    if (
      'properties' in schemaBody &&
      schemaBody.properties !== undefined &&
      (typeof schemaBody.properties !== 'object' ||
        schemaBody.properties === null ||
        Array.isArray(schemaBody.properties))
    ) {
      return false
    }
  }

  return true
}

type ResolvedTransportType = 'streamable-http' | 'sse' | 'unsupported'

function resolveTransportType(workload: CoreWorkload): ResolvedTransportType {
  const transportType = workload.transport_type

  if (transportType === 'stdio') {
    if (workload.proxy_mode === 'streamable-http') {
      return 'streamable-http'
    }
    if (workload.proxy_mode === 'sse' || workload.url?.includes('/sse')) {
      return 'sse'
    }
    return 'unsupported'
  }

  if (transportType === 'streamable-http') return 'streamable-http'
  if (transportType === 'sse') return 'sse'
  return 'sse'
}

export function buildMcpClientTransport(workload: CoreWorkload): Transport {
  const transportType = resolveTransportType(workload)

  if (transportType === 'unsupported') {
    throw new Error(
      `Workload ${workload.name ?? 'unknown'} has no HTTP proxy endpoint; use streamable-http or sse proxy_mode`
    )
  }

  if (transportType === 'streamable-http') {
    const urlString = workload.url || `http://localhost:${workload.port}/mcp`
    return new StreamableHTTPClientTransport(new URL(urlString))
  }

  const sseUrl = workload.url?.includes('/sse')
    ? workload.url
    : `http://localhost:${workload.port}/sse#${workload.name}`
  return new SSEClientTransport(new URL(sseUrl))
}

export async function connectWorkloadMcpClient(
  workload: CoreWorkload,
  options: ConnectWorkloadMcpClientOptions = {}
): Promise<ConnectedMcpClient> {
  const client = new Client(
    {
      name: options.clientName ?? 'toolhive-studio',
      version: '1.0.0',
    },
    {
      capabilities: options.capabilities,
      versionNegotiation: { mode: 'auto' },
      inputRequired: { autoFulfill: false },
    }
  )

  await client.connect(buildMcpClientTransport(workload))

  let closed = false
  const close = async () => {
    if (closed) return
    closed = true
    await client.close()
  }

  return { client, close }
}

export async function getWorkloadAvailableTools(
  workload: CoreWorkload
): Promise<Record<string, McpToolDefinition> | null> {
  if (!workload.name) return null

  let connection: ConnectedMcpClient | null = null

  try {
    connection = await connectWorkloadMcpClient(workload, {
      clientName: 'toolhive-studio-discovery',
    })
    const { tools } = await connection.client.listTools()

    const serverMcpTools: Record<string, McpToolDefinition> = {}
    for (const tool of tools) {
      if (!tool.name) continue
      const schema =
        tool.inputSchema && typeof tool.inputSchema === 'object'
          ? tool.inputSchema
          : { type: 'object', properties: {} }

      serverMcpTools[tool.name] = {
        description: tool.description,
        inputSchema: jsonSchema({
          ...(schema as Record<string, unknown>),
          type: 'object',
          properties:
            'properties' in schema && schema.properties
              ? schema.properties
              : {},
          additionalProperties: false,
        }),
        _meta: tool._meta,
      }
    }

    return serverMcpTools
  } catch (error) {
    log.error(`Failed to discover tools for ${workload.name}:`, error)
    throw error
  } finally {
    if (connection) {
      await connection.close()
    }
  }
}
