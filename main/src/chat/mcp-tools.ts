import { runChatPromiseOr, runChatSyncOr } from './runtime'
import { McpService } from './mcp/mcp-service'
import {
  fetchUiResource as fetchUiResourceImpl,
  proxyMcpToolCall as proxyMcpToolCallImpl,
} from './mcp/mcp-service-impl'

export function getCachedUiMetadata() {
  return runChatSyncOr(McpService.getCachedUiMetadata(), {})
}

export async function fetchUiResource(serverName: string, resourceUri: string) {
  return fetchUiResourceImpl(serverName, resourceUri)
}

export async function proxyMcpToolCall(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>
) {
  return proxyMcpToolCallImpl(serverName, toolName, args)
}

export async function getMcpServerTools(serverName: string, threadId?: string) {
  return runChatPromiseOr(
    McpService.getMcpServerTools(serverName, threadId),
    null
  )
}

export async function createMcpTools(
  threadId?: string,
  options?: { sanitizeSchemas?: boolean }
) {
  return runChatPromiseOr(McpService.createMcpTools(threadId, options), {
    tools: {},
    clients: [],
    enabledTools: {},
  })
}
