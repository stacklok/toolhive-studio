import { runChatPromise, runChatSync } from './runtime'
import { McpService } from './mcp/mcp-service'
import {
  fetchUiResource as fetchUiResourceImpl,
  proxyMcpToolCall as proxyMcpToolCallImpl,
} from './mcp/mcp-service-impl'

export function getCachedUiMetadata() {
  return runChatSync(McpService.getCachedUiMetadata())
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
  return runChatPromise(McpService.getMcpServerTools(serverName, threadId))
}

export async function createMcpTools(
  threadId?: string,
  options?: { sanitizeSchemas?: boolean }
) {
  return runChatPromise(McpService.createMcpTools(threadId, options))
}
