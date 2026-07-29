import * as Sentry from '@sentry/electron/main'
import { createAiMcpTool } from './mcp-ai-tool'
import type { ToolSet } from 'ai'
import type {
  McpUiResourceCsp,
  McpUiResourcePermissions,
} from '@modelcontextprotocol/ext-apps/app-bridge'
import { getApiV1BetaWorkloads } from '@common/api/generated/sdk.gen'
import { createMainProcessApiClient } from '../../unix-socket-fetch'
import log from '../../logger'
import type { AvailableServer } from '../types'
import {
  type McpToolDefinition,
  connectWorkloadMcpClient,
  getWorkloadAvailableTools,
  MCP_UI_EXTENSION_CAPABILITY,
} from '../../utils/mcp-tools'
import type { CoreWorkload } from '@common/api/generated/types.gen'
import { Effect } from 'effect'
import { readAllMcpAppUiMetadata } from '../../db/readers/mcp-app-ui-metadata-reader'
import { replaceAllMcpAppUiMetadata } from '../../db/writers/mcp-app-ui-metadata-writer'
import type {
  McpUiMetadataCache,
  ToolUiMetadataEntry,
} from './mcp-ui-metadata-cache'

interface UiResourceMetadata {
  html: string
  csp?: McpUiResourceCsp
  permissions?: McpUiResourcePermissions
  prefersBorder?: boolean
}

export interface McpToolSession {
  tools: ToolSet
  enabledTools: Record<string, string[]>
  close: () => Promise<void>
}

// Module-level fallback cache for direct impl imports in unit tests.
let cachedUiMetadata: Record<string, ToolUiMetadataEntry> = {}
let uiMetadataLoaded = false
let runtimeMetadataCache: McpUiMetadataCache | null = null

export function bindMcpUiMetadataCache(cache: McpUiMetadataCache): void {
  runtimeMetadataCache = cache
}

function ensureUiMetadataLoaded(): void {
  if (runtimeMetadataCache) return
  if (uiMetadataLoaded) return
  try {
    cachedUiMetadata = readAllMcpAppUiMetadata()
    uiMetadataLoaded = true
  } catch (error) {
    log.error('[MCP Apps] Failed to load UI metadata from DB:', error)
  }
}

export function getCachedUiMetadata(): Record<string, ToolUiMetadataEntry> {
  if (runtimeMetadataCache) {
    return Effect.runSync(runtimeMetadataCache.get())
  }
  ensureUiMetadataLoaded()
  return { ...cachedUiMetadata }
}

function commitUiMetadata(next: Record<string, ToolUiMetadataEntry>): void {
  if (runtimeMetadataCache) {
    Effect.runSync(runtimeMetadataCache.commit(next))
    return
  }
  cachedUiMetadata = next
  uiMetadataLoaded = true
}

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

async function createRawMcpClientForServer(serverName: string): Promise<{
  client: Awaited<ReturnType<typeof connectWorkloadMcpClient>>['client']
  close: () => Promise<void>
}> {
  const workload = (await fetchWorkloads()).find((w) => w.name === serverName)
  if (!workload) throw new Error(`Workload not found: ${serverName}`)

  const connection = await connectWorkloadMcpClient(workload, {
    clientName: 'toolhive-studio-mcp-apps',
    capabilities: { extensions: MCP_UI_EXTENSION_CAPABILITY },
  })

  return { client: connection.client, close: connection.close }
}

export async function fetchUiResource(
  serverName: string,
  resourceUri: string
): Promise<UiResourceMetadata> {
  const { client, close } = await createRawMcpClientForServer(serverName)
  try {
    const result = await client.readResource({ uri: resourceUri })
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
    return await client.callTool({ name: toolName, arguments: args })
  } finally {
    await close()
  }
}

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

  if (
    inputSchema &&
    typeof inputSchema === 'object' &&
    'jsonSchema' in inputSchema
  ) {
    const wrapped = (inputSchema as { jsonSchema?: unknown }).jsonSchema
    if (
      wrapped &&
      typeof wrapped === 'object' &&
      'properties' in wrapped &&
      wrapped.properties &&
      typeof wrapped.properties === 'object' &&
      !Array.isArray(wrapped.properties)
    ) {
      return wrapped.properties as Record<string, unknown>
    }
  }

  return {}
}

export async function getMcpServerTools(
  serverName: string,
  _threadId?: string,
  _enabledToolsOverride?: Record<string, string[]>
): Promise<AvailableServer | null> {
  if (!serverName) {
    log.error('getMcpServerTools: serverName is not passed')
  }

  const workloads = await fetchWorkloads()
  const workload = workloads.find((w) => w.name === serverName)

  const enabledTools = _enabledToolsOverride ?? {}
  const enabledToolNames = enabledTools[serverName] || []

  if (!workload) {
    throw new Error('Server not in the workload list')
  }

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

export async function createMcpTools(
  threadId?: string,
  options?: { sanitizeSchemas?: boolean },
  deps?: {
    getEnabledMcpTools: () => Promise<Record<string, string[]>>
    getThreadEnabledMcpTools: (
      threadId: string
    ) => Promise<Record<string, string[]>>
  }
): Promise<McpToolSession> {
  const mcpTools: ToolSet = {}
  const closeCallbacks: Array<() => Promise<void>> = []
  let enabledTools: Record<string, string[]> = {}
  const nextCachedUiMetadata: Record<string, ToolUiMetadataEntry> = {}
  let discoverySucceeded = false

  let closePromise: Promise<void> | null = null
  const close = async () => {
    if (closePromise) return closePromise
    closePromise = Promise.allSettled(closeCallbacks.map((fn) => fn())).then(
      () => undefined
    )
    return closePromise
  }

  const registerToolMetadata = (
    toolName: string,
    toolDef: unknown,
    serverName: string
  ): boolean => {
    const ui = extractToolUiMeta(toolDef)
    if (shouldSkipAppOnlyTool(ui)) return false
    if (ui?.resourceUri) {
      nextCachedUiMetadata[toolName] = {
        resourceUri: ui.resourceUri,
        serverName,
      }
    }
    return true
  }

  try {
    const resolveEnabled = deps
      ? threadId
        ? () => deps.getThreadEnabledMcpTools(threadId)
        : deps.getEnabledMcpTools
      : async () => ({})

    const [workloads, resolvedEnabledTools] = await Promise.all([
      fetchWorkloads(),
      resolveEnabled(),
    ])
    enabledTools = resolvedEnabledTools
    discoverySucceeded = true

    for (const [serverName, toolNames] of Object.entries(enabledTools)) {
      if (toolNames.length === 0) continue

      const workload = workloads.find((w) => w.name === serverName)

      if (!workload) {
        log.debug(`Skipping ${serverName}: workload not found`)
        continue
      }

      log.debug(`Found MCP workload for ${serverName}:`, workload.package)

      let connection: Awaited<
        ReturnType<typeof connectWorkloadMcpClient>
      > | null = null

      try {
        connection = await connectWorkloadMcpClient(workload, {
          clientName: 'toolhive-studio-playground',
          capabilities: { extensions: MCP_UI_EXTENSION_CAPABILITY },
        })
        closeCallbacks.push(connection.close)

        const { tools: listedTools } = await connection.client.listTools()
        const toolsByName = new Map(
          listedTools.map((tool) => [tool.name, tool])
        )

        let addedToolsCount = 0
        for (const toolName of toolNames) {
          const nativeTool = toolsByName.get(toolName)
          if (nativeTool === undefined) {
            log.warn(`Tool ${toolName} not found in server ${serverName}`)
            continue
          }

          const ui = extractToolUiMeta(nativeTool)
          if (shouldSkipAppOnlyTool(ui)) {
            log.debug(`Skipping app-only tool ${toolName} from ${serverName}`)
            continue
          }

          const aiTool = createAiMcpTool({
            client: connection.client,
            toolName,
            definition: nativeTool,
            sanitizeSchema: options?.sanitizeSchemas,
          })

          mcpTools[toolName] = aiTool
          registerToolMetadata(toolName, nativeTool, serverName)
          addedToolsCount++
        }

        log.debug(
          `Added ${addedToolsCount}/${toolNames.length} tools from ${serverName}`
        )

        if (addedToolsCount === 0 && connection) {
          await connection.close()
          closeCallbacks.pop()
        }
      } catch (error) {
        if (connection) {
          await connection.close()
          const idx = closeCallbacks.indexOf(connection.close)
          if (idx >= 0) closeCallbacks.splice(idx, 1)
        }
        log.error(`Failed to create MCP client for ${serverName}:`, error)
      }
    }
  } catch (error) {
    log.error('Failed to create MCP tools:', error)
  }

  if (discoverySucceeded) {
    commitUiMetadata(nextCachedUiMetadata)

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

  return { tools: mcpTools, enabledTools, close }
}
