import type { ChatUIMessage } from '../types'

export type ExportFormat = 'markdown' | 'json' | 'text'

/**
 * Formats tool output for text display
 */
function formatToolOutput(output: unknown): string {
  if (!output) return 'No output'

  // Handle MCP server response format
  if (
    typeof output === 'object' &&
    output !== null &&
    'content' in output &&
    Array.isArray((output as Record<string, unknown>).content)
  ) {
    const content = (output as Record<string, unknown>).content as Array<
      Record<string, unknown>
    >
    return content
      .map((item) => {
        if (item.type === 'text') {
          return String(item.text || '')
        }
        return `[${String(item.type)}]`
      })
      .join('\n')
  }

  // Fallback to JSON
  return JSON.stringify(output, null, 2)
}

/**
 * Converts a chat message to plain text format
 */
function messageToText(message: ChatUIMessage): string {
  const role = message.role === 'user' ? 'User' : 'Assistant'
  const timestamp = message.metadata?.createdAt
    ? new Date(message.metadata.createdAt).toLocaleString()
    : new Date().toLocaleString()

  let text = `[${timestamp}] ${role}:\n`

  // Process parts in order to maintain conversation flow
  for (const part of message.parts) {
    if (part.type === 'text' && 'text' in part) {
      text += `${part.text || ''}\n`
    } else if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
      // Extract tool call info
      const toolName =
        part.type === 'dynamic-tool'
          ? 'toolName' in part
            ? String(part.toolName)
            : 'Unknown Tool'
          : part.type.replace('tool-', '')

      const input = 'input' in part ? part.input : undefined
      const output = 'output' in part ? part.output : undefined

      text += `\n[Tool Call: ${toolName}]\n`
      if (input) {
        text += `Input: ${JSON.stringify(input)}\n`
      }
      if (output) {
        text += `Output:\n${formatToolOutput(output)}\n`
      }
      text += '\n'
    }
  }

  return text + '\n'
}

/**
 * Converts a chat message to markdown format
 */
function messageToMarkdown(message: ChatUIMessage): string {
  const role = message.role === 'user' ? '👤 User' : '🤖 Assistant'
  const timestamp = message.metadata?.createdAt
    ? new Date(message.metadata.createdAt).toLocaleString()
    : new Date().toLocaleString()

  let markdown = `### ${role}\n\n`
  markdown += `*${timestamp}*\n\n`

  if (message.metadata?.model) {
    markdown += `**Model:** ${message.metadata.model}\n\n`
  }

  // Process parts in order to maintain conversation flow
  for (const part of message.parts) {
    if (part.type === 'text' && 'text' in part) {
      markdown += `${part.text || ''}\n\n`
    } else if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
      // Extract tool call info
      const toolName =
        part.type === 'dynamic-tool'
          ? 'toolName' in part
            ? String(part.toolName)
            : 'Unknown Tool'
          : part.type.replace('tool-', '')

      const input = 'input' in part ? part.input : undefined
      const output = 'output' in part ? part.output : undefined
      const state = 'state' in part ? String(part.state) : undefined

      markdown += `#### 🔧 Tool Call: ${toolName}\n\n`
      markdown += `<details open>\n<summary>Details</summary>\n\n`

      if (input) {
        markdown += `**Input Parameters:**\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\`\n\n`
      }

      if (output) {
        markdown += `**Output:**\n\`\`\`\n${formatToolOutput(output)}\n\`\`\`\n\n`
      }

      if (state) {
        markdown += `**Status:** ${state}\n\n`
      }

      markdown += `</details>\n\n`
    }
  }

  // Add token usage for assistant messages
  if (message.role === 'assistant' && message.metadata?.totalUsage) {
    const usage = message.metadata.totalUsage
    markdown += `<details>\n<summary>Token Usage</summary>\n\n`
    if (usage.inputTokens) markdown += `- Input: ${usage.inputTokens}\n`
    if (usage.outputTokens) markdown += `- Output: ${usage.outputTokens}\n`
    if (usage.totalTokens) markdown += `- Total: ${usage.totalTokens}\n`
    if (message.metadata.responseTime) {
      markdown += `- Response Time: ${(message.metadata.responseTime / 1000).toFixed(2)}s\n`
    }
    markdown += `</details>\n\n`
  }

  markdown += `---\n\n`
  return markdown
}

/**
 * Exports chat messages to the specified format
 */
export function exportChat(
  messages: ChatUIMessage[],
  format: ExportFormat
): void {
  if (messages.length === 0) {
    throw new Error('No messages to export')
  }

  let content: string
  let filename: string
  let mimeType: string

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)

  switch (format) {
    case 'markdown':
      content = `# Chat Export\n\n`
      content += `*Exported on ${new Date().toLocaleString()}*\n\n`
      content += `---\n\n`
      content += messages.map((msg) => messageToMarkdown(msg)).join('')
      filename = `chat-export-${timestamp}.md`
      mimeType = 'text/markdown'
      break

    case 'json':
      content = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          messageCount: messages.length,
          messages: messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.parts
              .filter((p) => p.type === 'text' && 'text' in p)
              .map((p) => ('text' in p ? p.text : ''))
              .join(''),
            parts: msg.parts.map((part) => {
              if (part.type === 'text' && 'text' in part) {
                return {
                  type: 'text',
                  content: part.text || '',
                }
              } else if (
                part.type === 'dynamic-tool' ||
                part.type.startsWith('tool-')
              ) {
                const toolName =
                  part.type === 'dynamic-tool'
                    ? 'toolName' in part
                      ? String(part.toolName)
                      : 'Unknown Tool'
                    : part.type.replace('tool-', '')

                return {
                  type: 'tool-call',
                  toolName,
                  toolCallId:
                    'toolCallId' in part ? String(part.toolCallId) : undefined,
                  input: 'input' in part ? part.input : undefined,
                  output: 'output' in part ? part.output : undefined,
                  state: 'state' in part ? String(part.state) : undefined,
                }
              }
              return {
                type: part.type,
              }
            }),
            metadata: msg.metadata,
            timestamp: msg.metadata?.createdAt
              ? new Date(msg.metadata.createdAt).toISOString()
              : new Date().toISOString(),
          })),
        },
        null,
        2
      )
      filename = `chat-export-${timestamp}.json`
      mimeType = 'application/json'
      break

    case 'text':
      content = `Chat Export\n`
      content += `Exported on ${new Date().toLocaleString()}\n`
      content += `${'='.repeat(60)}\n\n`
      content += messages.map((msg) => messageToText(msg)).join('\n')
      filename = `chat-export-${timestamp}.txt`
      mimeType = 'text/plain'
      break

    default:
      throw new Error(`Unsupported export format: ${format}`)
  }

  // Create and trigger download
  downloadFile(content, filename, mimeType)
}

/**
 * Creates a downloadable file and triggers the browser download
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Delay URL revocation to ensure download starts successfully
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
