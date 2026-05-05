import type { ChatUIMessage } from '../types'
import type { ToolUiMetadataEntry } from '../hooks/use-mcp-app-metadata'

/**
 * True when a message renders an `<McpAppView>` iframe — i.e. an assistant
 * tool-result whose tool has registered MCP App UI metadata. The virtualizer
 * uses this to pin such rows so iframe state and in-progress user input
 * survive scroll-recycling.
 *
 * Mirrors the dispatch logic in `assistant-message.tsx`: both `dynamic-tool`
 * parts and the `tool-*` static parts can carry an MCP UI, but only once the
 * tool has actually produced output.
 */
export function hasMcpUiPart(
  message: ChatUIMessage,
  uiMetadata: Record<string, ToolUiMetadataEntry>
): boolean {
  if (message.role !== 'assistant') return false
  return message.parts.some((part) => {
    const isOutputAvailable =
      'state' in part && part.state === 'output-available'
    if (!isOutputAvailable) return false

    if (part.type === 'dynamic-tool') {
      const toolName = 'toolName' in part ? String(part.toolName) : null
      return Boolean(toolName && uiMetadata[toolName])
    }
    if (part.type.startsWith('tool-')) {
      const toolName = part.type.replace('tool-', '')
      return Boolean(uiMetadata[toolName])
    }
    return false
  })
}
