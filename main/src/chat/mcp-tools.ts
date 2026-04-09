import * as Sentry from '@sentry/electron/main'
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp'
import type { ToolSet } from 'ai'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  ReadResourceResultSchema,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type {
  McpUiResourceCsp,
  McpUiResourcePermissions,
} from '@modelcontextprotocol/ext-apps/app-bridge'
import { createClient } from '@common/api/generated/client'
import { getApiV1BetaWorkloads } from '@common/api/generated/sdk.gen'
import { getHeaders } from '../headers'
import { getToolhivePort, getToolhiveMcpPort } from '../toolhive-manager'
import log from '../logger'
import type { AvailableServer } from './types'
import { getEnabledMcpTools } from './settings-storage'
import {
  type McpToolDefinition,
  buildRawTransport,
  createTransport,
  getWorkloadAvailableTools,
  isMcpToolDefinition,
} from '../utils/mcp-tools'
import { TOOLHIVE_MCP_SERVER_NAME } from '../utils/constants'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'

// Advertised to MCP servers during initialize so they expose UI-enabled tools
const MCP_UI_EXTENSION_CAPABILITY = {
  'io.modelcontextprotocol/ui': { mimeTypes: ['text/html;profile=mcp-app'] },
} as const

interface ToolUiMetadataEntry {
  resourceUri: string
  serverName: string
}

interface UiResourceMetadata {
  html: string
  csp?: McpUiResourceCsp
  permissions?: McpUiResourcePermissions
  prefersBorder?: boolean
}

// Module-level cache populated by createMcpTools() on each chat stream
let cachedUiMetadata: Record<string, ToolUiMetadataEntry> = {}

export function getCachedUiMetadata(): Record<string, ToolUiMetadataEntry> {
  return { ...cachedUiMetadata }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Returns a transport for the ToolHive-internal MCP server. */
function createToolhiveMcpTransport(): StreamableHTTPClientTransport {
  const port = getToolhiveMcpPort()
  if (!port) throw new Error('Toolhive MCP port not available')
  return new StreamableHTTPClientTransport(
    new URL(`http://localhost:${port}/mcp`)
  )
}

/** Fetches all workloads from the ToolHive API. */
async function fetchWorkloads(): Promise<CoreWorkload[]> {
  const port = getToolhivePort()
  const client = createClient({
    baseUrl: `http://localhost:${port}`,
    headers: getHeaders(),
  })
  const { data } = await getApiV1BetaWorkloads({ client })
  return data?.workloads ?? []
}

/** Extracts the `_meta.ui` block from a raw tool definition. */
function extractToolUiMeta(
  toolDef: unknown
): { resourceUri?: string; visibility?: string[] } | undefined {
  return (toolDef as { _meta?: Record<string, unknown> })?._meta?.['ui'] as
    | { resourceUri?: string; visibility?: string[] }
    | undefined
}

/** Returns true when a tool is app-only and must not be exposed to the model. */
function shouldSkipAppOnlyTool(
  ui: { resourceUri?: string; visibility?: string[] } | undefined
): boolean {
  return !!ui?.visibility && !ui.visibility.includes('model')
}

async function createRawMcpClientForServer(
  serverName: string
): Promise<{ client: Client; close: () => Promise<void> }> {
  const clientInfo = { name: 'toolhive-studio-mcp-apps', version: '1.0.0' }
  const clientOptions = {
    capabilities: { extensions: MCP_UI_EXTENSION_CAPABILITY },
  }

  if (serverName === TOOLHIVE_MCP_SERVER_NAME) {
    const client = new Client(clientInfo, clientOptions)
    await client.connect(createToolhiveMcpTransport())
    return { client, close: () => client.close() }
  }

  const workload = (await fetchWorkloads()).find((w) => w.name === serverName)
  if (!workload) throw new Error(`Workload not found: ${serverName}`)

  const client = new Client(clientInfo, clientOptions)
  await client.connect(buildRawTransport(workload))
  return { client, close: () => client.close() }
}

export async function fetchUiResource(
  serverName: string,
  resourceUri: string
): Promise<UiResourceMetadata> {
  const { client, close } = await createRawMcpClientForServer(serverName)
  try {
    const result = await client.request(
      { method: 'resources/read', params: { uri: resourceUri } },
      ReadResourceResultSchema
    )
    const content = result.contents[0]
    if (!content) throw new Error('Empty resource response')

    let html: string
    if ('text' in content && content.text) {
      html = content.text
    } else if ('blob' in content && content.blob) {
      html = Buffer.from(content.blob, 'base64').toString('utf-8')
    } else {
      throw new Error('Resource content has no text or blob')
    }

    // Extract per-resource CSP and permission metadata from the response
    const uiMeta = (content as { _meta?: { ui?: Record<string, unknown> } })
      ._meta?.ui

    return {
      html,
      csp: uiMeta?.csp as McpUiResourceCsp | undefined,
      permissions: uiMeta?.permissions as McpUiResourcePermissions | undefined,
      prefersBorder: uiMeta?.prefersBorder as boolean | undefined,
    }
  } finally {
    await close()
  }
}

export async function proxyMcpToolCall(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const { client, close } = await createRawMcpClientForServer(serverName)
  try {
    const result = await client.request(
      { method: 'tools/call', params: { name: toolName, arguments: args } },
      CallToolResultSchema
    )
    return result
  } finally {
    await close()
  }
}

// Helper to safely extract properties
function getToolParameters(inputSchema: unknown): Record<string, unknown> {
  if (
    inputSchema &&
    typeof inputSchema === 'object' &&
    'properties' in inputSchema &&
    inputSchema['properties'] &&
    typeof inputSchema['properties'] === 'object' &&
    !Array.isArray(inputSchema['properties'])
  ) {
    return inputSchema['properties'] as Record<string, unknown>
  }
  return {}
}

// Check if Toolhive MCP is available and get its tools info
export async function getToolhiveMcpInfo(
  enabledToolNames: string[] = []
): Promise<AvailableServer> {
  const base = {
    serverName: TOOLHIVE_MCP_SERVER_NAME,
    serverPackage: 'toolhive-mcp',
    tools: [],
    isRunning: false,
  }

  if (!getToolhiveMcpPort()) {
    return { ...base, isRunning: false }
  }

  try {
    const toolhiveMcpClient = await createMCPClient({
      name: 'mcp_toolhive',
      transport: createToolhiveMcpTransport(),
      capabilities: { extensions: MCP_UI_EXTENSION_CAPABILITY },
    })
    const toolhiveMcpTools = await toolhiveMcpClient.tools()
    await toolhiveMcpClient.close()

    const tools = Object.keys(toolhiveMcpTools).map((toolName) => {
      const toolDef = toolhiveMcpTools[toolName]
      let description = ''

      if (toolDef && typeof toolDef === 'object') {
        const tool = toolDef as Record<string, unknown>
        if (tool.description && typeof tool.description === 'string') {
          description = tool.description
        }
      }

      return {
        name: toolName,
        description,
        parameters: getToolParameters(toolDef?.inputSchema),
        enabled: enabledToolNames.includes(toolName),
      }
    })

    return {
      serverName: TOOLHIVE_MCP_SERVER_NAME,
      serverPackage: 'toolhive-mcp',
      tools,
      isRunning: true,
    }
  } catch (error) {
    log.error('Failed to get Toolhive MCP info:', error)
    return { ...base, isRunning: false }
  }
}

// Get MCP server tools information
export async function getMcpServerTools(
  serverName: string
): Promise<AvailableServer | null> {
  if (!serverName) {
    log.error('getMcpServerTools: serverName is not passed')
  }

  const workloads = await fetchWorkloads()
  const workload = workloads.find((w) => w.name === serverName)

  // Get enabled tools for this server
  const enabledTools = await getEnabledMcpTools()
  const enabledToolNames = enabledTools[serverName] || []

  if (!workload && serverName === TOOLHIVE_MCP_SERVER_NAME) {
    const toolhiveMcpResult = await getToolhiveMcpInfo(enabledToolNames)
    return toolhiveMcpResult
  }

  if (!workload) {
    throw new Error('Server not in the workload list')
  }

  // If workload.tools is empty, try to discover tools by connecting to the server
  let discoveredTools: string[] = workload.tools || []
  let serverMcpTools: Record<string, McpToolDefinition> = {}

  if (discoveredTools.length === 0 && workload.status === 'running') {
    serverMcpTools = (await getWorkloadAvailableTools(workload)) || {}
    discoveredTools = Object.keys(serverMcpTools)
  }

  const result = {
    serverName: workload.name!,
    serverPackage: workload.package,
    tools: discoveredTools.map(
      (
        toolName
      ): {
        name: string
        description: string
        parameters: Record<string, unknown>
        enabled: boolean
      } => {
        const toolDef = serverMcpTools[toolName]
        return {
          name: toolName,
          description: toolDef?.description || '',
          parameters: getToolParameters(toolDef?.inputSchema),
          enabled: enabledToolNames.includes(toolName),
        }
      }
    ),
    isRunning: workload.status === 'running',
  }

  return result
}

// Create MCP tools for AI SDK
export async function createMcpTools(): Promise<{
  tools: ToolSet
  clients: Awaited<ReturnType<typeof createMCPClient>>[]
  enabledTools: Record<string, string[]>
}> {
  const mcpTools: ToolSet = {}
  const mcpClients: Awaited<ReturnType<typeof createMCPClient>>[] = []
  let enabledTools: Record<string, string[]> = {}
  // Reset the UI metadata cache for this stream session
  cachedUiMetadata = {}

  /** Registers a validated tool and caches its UI metadata if present. */
  const registerTool = (
    toolName: string,
    toolDef: unknown,
    serverName: string
  ): boolean => {
    if (!isMcpToolDefinition(toolDef)) return false
    const ui = extractToolUiMeta(toolDef)
    if (shouldSkipAppOnlyTool(ui)) return false
    mcpTools[toolName] = toolDef
    if (ui?.resourceUri) {
      cachedUiMetadata[toolName] = { resourceUri: ui.resourceUri, serverName }
    }
    return true
  }

  const addToolhiveMcpTools = async () => {
    if (!getToolhiveMcpPort()) return
    try {
      const toolhiveMcpClient = await createMCPClient({
        name: 'toolhive-mcp',
        transport: createToolhiveMcpTransport(),
        capabilities: { extensions: MCP_UI_EXTENSION_CAPABILITY },
      })
      mcpClients.push(toolhiveMcpClient)
      const toolhiveMcpTools = await toolhiveMcpClient.tools()
      for (const [toolName, toolDef] of Object.entries(toolhiveMcpTools)) {
        registerTool(toolName, toolDef, TOOLHIVE_MCP_SERVER_NAME)
      }
    } catch (error) {
      log.error('Failed to create Toolhive MCP client:', error)
    }
  }

  try {
    const [workloads, resolvedEnabledTools] = await Promise.all([
      fetchWorkloads(),
      getEnabledMcpTools(),
    ])
    enabledTools = resolvedEnabledTools

    for (const [serverName, toolNames] of Object.entries(enabledTools)) {
      if (toolNames.length === 0) continue

      const workload = workloads.find((w) => w.name === serverName)

      if (!workload && serverName === TOOLHIVE_MCP_SERVER_NAME) {
        await addToolhiveMcpTools()
        continue
      }

      if (!workload) {
        log.debug(`Skipping ${serverName}: workload not found`)
        continue
      }

      log.debug(`Found MCP workload for ${serverName}:`, workload.package)

      try {
        const mcpClient = await createMCPClient({
          ...createTransport(workload),
          capabilities: { extensions: MCP_UI_EXTENSION_CAPABILITY },
        })
        mcpClients.push(mcpClient)

        const serverMcpTools = await mcpClient.tools()
        let addedToolsCount = 0
        for (const toolName of toolNames) {
          const tool = serverMcpTools[toolName]
          if (tool === undefined) {
            log.warn(`Tool ${toolName} not found in server ${serverName}`)
          } else if (registerTool(toolName, tool, serverName)) {
            addedToolsCount++
          } else if (shouldSkipAppOnlyTool(extractToolUiMeta(tool))) {
            log.debug(`Skipping app-only tool ${toolName} from ${serverName}`)
          } else {
            log.warn(`Tool ${toolName} from ${serverName} failed validation`)
          }
        }
        log.debug(
          `Added ${addedToolsCount}/${toolNames.length} tools from ${serverName}`
        )
      } catch (error) {
        log.error(`Failed to create MCP client for ${serverName}:`, error)
      }
    }
  } catch (error) {
    log.error('Failed to create MCP tools:', error)
  }

  const uiToolCount = Object.keys(cachedUiMetadata).length
  if (uiToolCount > 0) {
    Sentry.addBreadcrumb({
      category: 'mcp-apps',
      message: `Discovered ${uiToolCount} UI-enabled tool(s)`,
      level: 'info',
      data: { tools: Object.keys(cachedUiMetadata) },
    })
  }

  return { tools: mcpTools, clients: mcpClients, enabledTools }
}
