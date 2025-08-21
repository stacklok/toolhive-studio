import { streamText, stepCountIs } from 'ai'
import log from '../logger'
import { CHAT_PROVIDERS } from './providers'
import { createMcpTools } from './mcp-tools'
import { streamUIMessagesOverIPC } from './stream-utils'
import type { ChatRequest } from './types'
/**
 * Handle chat streaming request using real-time IPC events
 */
export async function handleChatStreamRealtime(
  request: ChatRequest,
  streamId: string,
  sender: Electron.WebContents
): Promise<void> {
  try {
    // Validate provider
    const provider = CHAT_PROVIDERS.find((p) => p.id === request.provider)
    if (!provider) {
      throw new Error(`Unknown provider: ${request.provider}`)
    }

    // Create AI model
    const model = provider.createModel(request.model, request.apiKey)

    // Convert messages to AI SDK CoreMessage format
    const messages = request.messages
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.parts
          .filter(
            (part) => part.type === 'text' && part.text && part.text.trim()
          )
          .map((part) => part.text!.trim())
          .join('\n'),
      }))
      .filter((msg) => msg.content.trim().length > 0) // Filter out messages with empty content

    // Get MCP tools if enabled
    const { tools: mcpTools, clients: mcpClients } = await createMcpTools()

    try {
      // Use AI SDK's streamText - this is the recommended approach
      const result = streamText({
        model,
        messages,
        tools: Object.keys(mcpTools).length > 0 ? mcpTools : undefined,
        toolChoice: Object.keys(mcpTools).length > 0 ? 'auto' : undefined,
        stopWhen: stepCountIs(50), // Increase step limit for complex tool chains
        system: `You are a helpful assistant with access to MCP (Model Context Protocol) servers from ToolHive.

You have access to various specialized tools from enabled MCP servers. Each tool is prefixed with the server name (e.g., github-stats-mcp_get_repository_info).

🚨 CRITICAL INSTRUCTION: After calling ANY tool, you MUST immediately follow up with a text response that processes and interprets the tool results. NEVER just call a tool and stop talking.

MANDATORY WORKFLOW:
1. Call the appropriate tool(s) to get data
2. IMMEDIATELY after the tool returns data, write a comprehensive text response
3. Parse and analyze the tool results in your text response
4. Extract key information and insights
5. Format everything in beautiful markdown
6. Provide a complete answer to the user's question

⚠️ IMPORTANT: You must ALWAYS provide a text response after tool calls. Tool calls alone are not sufficient - users need you to interpret and explain the results.

🔄 CONTINUATION RULE: Even if you've called tools, you MUST continue the conversation with a detailed analysis. Do not end your response after tool execution - always provide interpretation, insights, and a complete answer.

FORMATTING REQUIREMENTS:
- Always use **Markdown syntax** for all responses
- Use proper headings (# ## ###), lists (- or 1.), tables, code blocks, etc.
- Present tool results in well-structured, readable format
- Extract meaningful insights from data
- NEVER show raw JSON or unformatted technical data
- NEVER just say "here's the result" - always interpret and format it

🖼️ IMAGE HANDLING:
- When a tool returns an image, the image will automatically display in the tool output section
- NEVER include base64 image data in your text response
- NEVER use <image> tags or data URIs in your text
- DO NOT copy or paste image data from tool outputs into your response
- Simply provide context and analysis about what the image shows
- The tool output section will automatically render any images returned by tools
- Focus your text response on interpreting and explaining the results
- Example: "I've generated a bar chart showing the sales data. The chart displays the relationship between products and their sales figures, with smartphones having the highest sales."

MARKDOWN FORMATTING EXAMPLES:

For GitHub repository data:
\`\`\`markdown
# 📦 Repository: owner/repo-name

## 🚀 Latest Release: v1.2.3
- **Published:** March 15, 2024
- **Author:** @username
- **Downloads:** 1,234 total

## 📊 Repository Stats
| Metric | Value |
|--------|--------|
| ⭐ Stars | 1,234 |
| 🍴 Forks | 89 |
| 📝 Issues | 23 open |

## 💾 Download Options
- [Windows Setup](url) - 45 downloads
- [macOS DMG](url) - 234 downloads
- [Linux AppImage](url) - 123 downloads

## 📈 Recent Activity
The repository shows active development with regular commits and community engagement.
\`\`\`

Remember: Always interpret and format tool results beautifully. Never show raw data!`,
      })

      // Create UI message stream with metadata
      const startTime = Date.now()
      const uiMessageStream = result.toUIMessageStream({
        messageMetadata: ({ part }) => {
          // Send metadata when streaming starts
          if (part.type === 'start') {
            return {
              createdAt: Date.now(),
              model: request.model,
            }
          }

          // Send additional metadata when streaming completes
          if (part.type === 'finish') {
            const endTime = Date.now()
            return {
              totalUsage: part.totalUsage,
              responseTime: endTime - startTime,
              finishReason: part.finishReason,
            }
          }
        },
      })

      // Stream UI messages over IPC in real-time with cleanup callback
      streamUIMessagesOverIPC(sender, streamId, uiMessageStream, async () => {
        // Clean up MCP clients after stream completes

        for (const client of mcpClients) {
          try {
            await client.close()
          } catch (error) {
            log.error('[CHAT] Error closing MCP client:', error)
          }
        }
      })
    } catch (error) {
      // Clean up MCP clients on error as well

      for (const client of mcpClients) {
        try {
          await client.close()
        } catch (cleanupError) {
          log.error(
            '[CHAT] Error closing MCP client during error cleanup:',
            cleanupError
          )
        }
      }

      // Improve error messages for common API issues
      if (error instanceof Error) {
        if (
          error.message.includes('overloaded') ||
          error.message.includes('Overloaded')
        ) {
          throw new Error(
            'The AI service is currently overloaded. Please try again in a few moments.'
          )
        }
        if (
          error.message.includes('rate limit') ||
          error.message.includes('Rate limit')
        ) {
          throw new Error(
            'Rate limit exceeded. Please wait a moment before sending another message.'
          )
        }
        if (
          error.message.includes('insufficient_quota') ||
          error.message.includes('quota')
        ) {
          throw new Error(
            'API quota exceeded. Please check your API key billing status.'
          )
        }
        if (
          error.message.includes('invalid_api_key') ||
          error.message.includes('authentication')
        ) {
          throw new Error(
            'Invalid API key. Please check your API key configuration.'
          )
        }
      }

      throw error
    }
  } catch (error) {
    log.error('[CHAT] Chat stream error:', error)
    throw error
  }
}
