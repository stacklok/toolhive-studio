import { runChatPromiseOr, runChatSyncOr } from './runtime'
import { McpService } from './mcp/mcp-service'
import {
  fetchUiResource as fetchUiResourceImpl,
  proxyMcpToolCall as proxyMcpToolCallImpl,
} from './mcp/mcp-service-impl'

export function getCachedUiMetadata() {
  return runChatSyncOr(
    McpService.use((s) => s.getCachedUiMetadata()),
    {}
  )
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
    McpService.use((s) => s.getMcpServerTools(serverName, threadId)),
    null
  )
}

export async function createMcpTools(
  threadId?: string,
  options?: { sanitizeSchemas?: boolean }
) {
  return runChatPromiseOr(
    McpService.use((s) => s.createMcpTools(threadId, options)),
    {
      tools: {},
      enabledTools: {},
      enabledServersWithWorkload: 0,
      close: async () => undefined,
    }
  )
}
