import {
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClient as MCPClient,
} from 'ai'
import type { ToolSet } from 'ai'

import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { createClient } from '@api/client'
import { getApiV1BetaWorkloads } from '@api/sdk.gen'
import { getHeaders } from '../headers'
import { getToolhivePort, getToolhiveMcpPort } from '../toolhive-manager'
import log from '../logger'
import type { McpToolInfo } from './types'
import { getEnabledMcpTools } from './storage'
import {
  type McpToolDefinition,
  createTransport,
  getWorkloadAvailableTools,
  isMcpToolDefinition,
} from '../utils/mcp-tools'

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
export async function getToolhiveMcpInfo(): Promise<{
  available: boolean
  toolCount: number
  tools: Array<{ name: string; description: string }>
} | null> {
  const toolhiveMcpPort = getToolhiveMcpPort()
  if (!toolhiveMcpPort) {
    return { available: false, toolCount: 0, tools: [] }
  }

  try {
    const toolhiveMcpUrl = new URL(`http://localhost:${toolhiveMcpPort}/mcp`)
    const toolhiveMcpConfig = {
      name: 'toolhive-mcp',
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
      }
    })

    return {
      available: true,
      toolCount: tools.length,
      tools,
    }
  } catch (error) {
    log.error('Failed to get Toolhive MCP info:', error)
    return { available: false, toolCount: 0, tools: [] }
  }
}

// Get MCP server tools information
export async function getMcpServerTools(serverName?: string): Promise<
  | McpToolInfo[]
  | {
      serverName: string
      serverPackage?: string
      tools: Array<{
        name: string
        description?: string
        parameters?: Record<string, unknown>
        enabled: boolean
      }>
      isRunning: boolean
    }
  | null
> {
  const port = getToolhivePort()
  const client = createClient({
    baseUrl: `http://localhost:${port}`,
    headers: getHeaders(),
  })

  const { data } = await getApiV1BetaWorkloads({
    client,
  })
  const workloads = data?.workloads

  // If serverName is provided, return server-specific format
  if (serverName) {
    // Get server tools for specific server
    const workload = (workloads || []).find((w) => w.name === serverName)

    if (!workload) {
      throw new Error('Server not in the workload list')
    }

    // Get enabled tools for this server
    const enabledTools = getEnabledMcpTools()
    const enabledToolNames = enabledTools[serverName] || []

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

  // Otherwise return the original format for backward compatibility
  const mcpTools = (workloads || [])
    .filter(
      (workload) =>
        workload.name && workload.tools && workload.tool_type === 'mcp'
    )
    .flatMap((workload) =>
      workload.tools!.map((toolName) => ({
        name: `mcp_${workload.name}_${toolName}`,
        description: '',
        inputSchema: {},
        serverName: workload.name!,
      }))
    )

  return mcpTools
}

// Create MCP tools for AI SDK
export async function createMcpTools(): Promise<{
  tools: ToolSet
  clients: MCPClient[]
}> {
  const mcpTools: ToolSet = {}
  const mcpClients: MCPClient[] = []

  try {
    const port = getToolhivePort()
    const toolhiveMcpPort = getToolhiveMcpPort()

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

    const client = createClient({
      baseUrl: `http://localhost:${port}`,
      headers: getHeaders(),
    })

    const { data } = await getApiV1BetaWorkloads({
      client,
    })
    const workloads = data?.workloads

    // Get enabled tools from storage
    const enabledTools = getEnabledMcpTools()

    // Continue with regular MCP servers even if no enabled tools (since we might have Toolhive MCP)
    if (Object.keys(enabledTools).length === 0) {
      return { tools: mcpTools, clients: mcpClients }
    }

    // Create MCP clients for each server with enabled tools
    for (const [serverName, toolNames] of Object.entries(enabledTools)) {
      if (toolNames.length === 0) continue

      const workload = workloads?.find((w) => w.name === serverName)
      if (!workload || workload.tool_type !== 'mcp') continue

      try {
        const config = createTransport(workload)

        const mcpClient = await createMCPClient(config)

        mcpClients.push(mcpClient)

        // Get all tools from the MCP server using schema discovery
        const serverMcpTools = await mcpClient.tools()

        // Add only the enabled tools from this server
        for (const toolName of toolNames) {
          if (serverMcpTools[toolName]) {
            mcpTools[toolName] = serverMcpTools[toolName]
          }
        }

        // MCP client created successfully
      } catch (error) {
        log.error(`Failed to create MCP client for ${serverName}:`, error)
      }
    }

    // MCP tools created
  } catch (error) {
    log.error('Failed to create MCP tools:', error)
  }

  return { tools: mcpTools, clients: mcpClients }
}
