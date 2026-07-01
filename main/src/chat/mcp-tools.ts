import * as Sentry from '@sentry/electron/main'
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp'
import type { ToolSet } from 'ai'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
  ReadResourceResultSchema,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type {
  McpUiResourceCsp,
  McpUiResourcePermissions,
} from '@modelcontextprotocol/ext-apps/app-bridge'
import { getApiV1BetaWorkloads } from '@common/api/generated/sdk.gen'
import { createMainProcessApiClient } from '../unix-socket-fetch'
import log from '../logger'
import type { AvailableServer } from './types'
import { getEnabledMcpTools } from './settings-storage'
import { getThreadEnabledMcpTools } from './thread-settings-storage'
import {
  type McpToolDefinition,
  buildRawTransport,
  createTransport,
  getWorkloadAvailableTools,
  isMcpToolDefinition,
  sanitizeToolInputSchema,
} from '../utils/mcp-tools'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
import { readAllMcpAppUiMetadata } from '../db/readers/mcp-app-ui-metadata-reader'
import { replaceAllMcpAppUiMetadata } from '../db/writers/mcp-app-ui-metadata-writer'

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

// Module-level cache populated by createMcpTools() on each chat stream.
// Seeded lazily from SQLite on first access so historical MCP App tool
// calls can render after an app restart without waiting for a new stream.
let cachedUiMetadata: Record<string, ToolUiMetadataEntry> = {}
let uiMetadataLoaded = false

function ensureUiMetadataLoaded(): void {
  if (uiMetadataLoaded) return
  try {
    cachedUiMetadata = readAllMcpAppUiMetadata()
    // Only latch after a successful load — a transient DB read error
    // (e.g. locked DB at startup) should not disable retries for the rest
    // of the session.
    uiMetadataLoaded = true
  } catch (error) {
    log.error('[MCP Apps] Failed to load UI metadata from DB:', error)
  }
}

export function getCachedUiMetadata(): Record<string, ToolUiMetadataEntry> {
  ensureUiMetadataLoaded()
  return { ...cachedUiMetadata }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Fetches all workloads from the ToolHive API. */
async function fetchWorkloads(): Promise<CoreWorkload[]> {
  const client = createMainProcessApiClient()
  const { data } = await getApiV1BetaWorkloads({ client })
  return data?.workloads ?? []
}

/** Extracts the `_meta.ui` block from a raw tool definition. */
function extractToolUiMeta(
  toolDef: unknown
): { resourceUri?: string; visibility?: string[] } | undefined {
  return (toolDef as { _meta?: Record<string, unknown> })?._meta?.['ui'] as
    { resourceUri?: string; visibility?: string[] } | undefined
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

// Get MCP server tools information
export async function getMcpServerTools(
  serverName: string,
  threadId?: string
): Promise<AvailableServer | null> {
  if (!serverName) {
    log.error('getMcpServerTools: serverName is not passed')
  }

  const workloads = await fetchWorkloads()
  const workload = workloads.find((w) => w.name === serverName)

  // Get enabled tools for this server (per-thread when threadId is given,
  // otherwise fall back to the global defaults used by settings UIs).
  const enabledTools = threadId
    ? getThreadEnabledMcpTools(threadId)
    : await getEnabledMcpTools()
  const enabledToolNames = enabledTools[serverName] || []

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
export async function createMcpTools(
  threadId?: string,
  options?: { sanitizeSchemas?: boolean }
): Promise<{
  tools: ToolSet
  clients: Awaited<ReturnType<typeof createMCPClient>>[]
  enabledTools: Record<string, string[]>
}> {
  const mcpTools: ToolSet = {}
  const mcpClients: Awaited<ReturnType<typeof createMCPClient>>[] = []
  let enabledTools: Record<string, string[]> = {}
  // Build the UI metadata map for this stream session into a local object
  // and only swap it into the module-level cache (and persist it to SQLite)
  // once discovery has completed successfully. A transient fetchWorkloads()
  // or getEnabledMcpTools() failure must not wipe the previously persisted
  // snapshot — historical MCP App iframes rely on it.
  const nextCachedUiMetadata: Record<string, ToolUiMetadataEntry> = {}
  let discoverySucceeded = false

  /** Registers a validated tool and caches its UI metadata if present. */
  const registerTool = (
    toolName: string,
    toolDef: unknown,
    serverName: string
  ): boolean => {
    if (!isMcpToolDefinition(toolDef)) return false
    const ui = extractToolUiMeta(toolDef)
    if (shouldSkipAppOnlyTool(ui)) return false
    // Only Gemini needs schema normalization; other providers handle the
    // original schema (and keep richer constructs like union types).
    if (options?.sanitizeSchemas) sanitizeToolInputSchema(toolDef)
    mcpTools[toolName] = toolDef
    if (ui?.resourceUri) {
      nextCachedUiMetadata[toolName] = {
        resourceUri: ui.resourceUri,
        serverName,
      }
    }
    return true
  }

  try {
    const [workloads, resolvedEnabledTools] = await Promise.all([
      fetchWorkloads(),
      threadId
        ? Promise.resolve(getThreadEnabledMcpTools(threadId))
        : getEnabledMcpTools(),
    ])
    enabledTools = resolvedEnabledTools
    // Flag is set here, AFTER the two required calls resolved, so any
    // rejection above propagates into the catch below without flipping it.
    discoverySucceeded = true

    for (const [serverName, toolNames] of Object.entries(enabledTools)) {
      if (toolNames.length === 0) continue

      const workload = workloads.find((w) => w.name === serverName)

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

  if (discoverySucceeded) {
    // Swap the module-level cache in and persist it. Empty maps are
    // persisted too — a server that lost all UI tools should have its
    // stale entries removed. When discovery failed we skip both, keeping
    // the previously hydrated cache and DB rows intact.
    cachedUiMetadata = nextCachedUiMetadata
    uiMetadataLoaded = true

    const uiToolCount = Object.keys(nextCachedUiMetadata).length
    if (uiToolCount > 0) {
      Sentry.addBreadcrumb({
        category: 'mcp-apps',
        message: `Discovered ${uiToolCount} UI-enabled tool(s)`,
        level: 'info',
        data: { tools: Object.keys(nextCachedUiMetadata) },
      })
    }

    try {
      replaceAllMcpAppUiMetadata(nextCachedUiMetadata)
    } catch (error) {
      log.error('[MCP Apps] Failed to persist UI metadata to DB:', error)
    }
  }

  return { tools: mcpTools, clients: mcpClients, enabledTools }
}
