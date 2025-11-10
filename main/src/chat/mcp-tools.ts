import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp'
import type { ToolSet } from 'ai'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { createClient } from '@api/client'
import { getApiV1BetaWorkloads } from '@api/sdk.gen'
import { getHeaders } from '../headers'
import { getToolhivePort, getToolhiveMcpPort } from '../toolhive-manager'
import log from '../logger'
import type { AvailableServer } from './types'
import { getEnabledMcpTools } from './settings-storage'
import {
  type McpToolDefinition,
  createTransport,
  getWorkloadAvailableTools,
  isMcpToolDefinition,
} from '../utils/mcp-tools'
import { TOOLHIVE_MCP_SERVER_NAME } from '../utils/constants'

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
  const toolhiveMcpPort = getToolhiveMcpPort()
  const base = {
    serverName: TOOLHIVE_MCP_SERVER_NAME,
    serverPackage: 'toolhive-mcp',
    tools: [],
    isRunning: false,
  }

  if (!toolhiveMcpPort) {
    return { ...base, isRunning: false }
  }

  try {
    const toolhiveMcpUrl = new URL(`http://localhost:${toolhiveMcpPort}/mcp`)
    const toolhiveMcpConfig = {
      name: 'mcp_toolhive',
      transport: new StreamableHTTPClientTransport(toolhiveMcpUrl),
    }

    const toolhiveMcpClient = await createMCPClient(toolhiveMcpConfig)
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

  const port = getToolhivePort()
  const client = createClient({
    baseUrl: `http://localhost:${port}`,
    headers: getHeaders(),
  })

  const { data } = await getApiV1BetaWorkloads({
    client,
  })
  const workloads = data?.workloads

  // Get server tools for specific server
  const workload = (workloads || []).find((w) => w.name === serverName)

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

  try {
    const port = getToolhivePort()
    const toolhiveMcpPort = getToolhiveMcpPort()

    const getToolhiveMcpTools = async () => {
      // Add default Toolhive MCP client if toolhiveMcpPort is available
      if (toolhiveMcpPort) {
        try {
          const toolhiveMcpUrl = new URL(
            `http://localhost:${toolhiveMcpPort}/mcp`
          )
          const toolhiveMcpConfig = {
            name: 'toolhive-mcp',
            transport: new StreamableHTTPClientTransport(toolhiveMcpUrl),
          }

          const toolhiveMcpClient = await createMCPClient(toolhiveMcpConfig)
          mcpClients.push(toolhiveMcpClient)

          // Get all tools from the Toolhive MCP server
          const toolhiveMcpTools = await toolhiveMcpClient.tools()

          // Add all tools from Toolhive MCP (always enabled, cannot be disabled)
          for (const [toolName, toolDef] of Object.entries(toolhiveMcpTools)) {
            if (isMcpToolDefinition(toolDef)) {
              mcpTools[toolName] = toolDef
            }
          }
        } catch (error) {
          log.error('Failed to create Toolhive MCP client:', error)
        }
      }
    }

    const client = createClient({
      baseUrl: `http://localhost:${port}`,
      headers: getHeaders(),
    })

    const { data } = await getApiV1BetaWorkloads({
      client,
    })
    const workloads = data?.workloads

    // Get enabled tools from storage
    enabledTools = await getEnabledMcpTools()

    // Create MCP clients for each server with enabled tools
    for (const [serverName, toolNames] of Object.entries(enabledTools)) {
      if (toolNames.length === 0) continue

      const workload = workloads?.find((w) => w.name === serverName)

      if (!workload && serverName === TOOLHIVE_MCP_SERVER_NAME) {
        await getToolhiveMcpTools()
        continue
      }

      if (!workload) {
        log.debug(`Skipping ${serverName}: workload not found`)
        continue
      }

      log.debug(`Found MCP workload for ${serverName}:`, workload.package)

      try {
        const config = createTransport(workload)

        const mcpClient = await createMCPClient(config)

        mcpClients.push(mcpClient)

        // Get all tools from the MCP server using schema discovery
        const serverMcpTools = await mcpClient.tools()

        // Add only the enabled tools from this server
        let addedToolsCount = 0
        for (const toolName of toolNames) {
          const tool = serverMcpTools[toolName]
          if (tool && isMcpToolDefinition(tool)) {
            mcpTools[toolName] = tool
            addedToolsCount++
          } else if (tool) {
            log.warn(`Tool ${toolName} from ${serverName} failed validation`)
          } else {
            log.warn(`Tool ${toolName} not found in server ${serverName}`)
          }
        }

        log.debug(
          `Added ${addedToolsCount}/${toolNames.length} tools from ${serverName}`
        )
      } catch (error) {
        log.error(`Failed to create MCP client for ${serverName}:`, error)
      }
    }

    // MCP tools created
  } catch (error) {
    log.error('Failed to create MCP tools:', error)
  }

  return { tools: mcpTools, clients: mcpClients, enabledTools }
}
