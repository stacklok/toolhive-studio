import {
  streamText,
  stepCountIs,
  type UIMessage,
  convertToModelMessages,
  createIdGenerator,
} from 'ai'
import * as Sentry from '@sentry/electron/main'
import type { LanguageModelV2Usage } from '@ai-sdk/provider'
import log from '../logger'
import { CHAT_PROVIDERS } from './providers'
import { createMcpTools } from './mcp-tools'
import { streamUIMessagesOverIPC } from './stream-utils'
import type { ChatRequest } from './types'
import { updateThreadMessages } from './threads-storage'
import { isLocalServerRequest, hasApiKey } from './utils'

/**
 * Handle chat streaming request using real-time IPC events
 */
export async function handleChatStreamRealtime(
  request: ChatRequest,
  streamId: string,
  sender: Electron.WebContents
): Promise<void> {
  return Sentry.startSpanManual(
    {
      name: 'Chat streaming request',
      op: 'user.event',
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        stream_id: streamId,
        provider: request.provider,
        model: request.model,
        start_timestamp: new Date().toISOString(),
      },
    },
    async (span, finish) => {
      try {
        // Validate provider
        const provider = CHAT_PROVIDERS.find((p) => p.id === request.provider)
        if (!provider) {
          throw new Error(`Unknown provider: ${request.provider}`)
        }

        // Create AI model using type guards for discriminated union
        const model = isLocalServerRequest(request)
          ? provider.createModel(request.model, request.endpointURL)
          : hasApiKey(request)
            ? provider.createModel(request.model, request.apiKey)
            : (() => {
                throw new Error('Invalid request: missing credentials')
              })()

        // Get MCP tools if enabled
        const {
          tools: mcpTools,
          clients: mcpClients,
          enabledTools,
        } = await createMcpTools()

        try {
          const result = streamText({
            model,
            messages: convertToModelMessages(request.messages),
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

          // Create UI message stream with metadata and persistence
          const startTime = Date.now()
          Sentry.startSpan(
            {
              name: 'Chat streaming start',
              op: 'streaming.event',
              attributes: {
                'streaming.start_timestamp': new Date(startTime).toISOString(),
                ...Object.entries(enabledTools).reduce<
                  Record<string, string | undefined>
                >((prev, curr) => {
                  const [server, tools] = curr
                  prev[`streaming.workload_${server}_tools`] = tools.join(',')
                  return prev
                }, {}),
              },
            },
            (startSpan) => {
              startSpan.addLink({
                context: span.spanContext(),
                attributes: {
                  'sentry.link.type': 'previous_trace',
                },
              })
            }
          )

          // Use the AI SDK's built-in UI message stream
          const uiMessageStream = result.toUIMessageStream({
            originalMessages: request.messages,
            generateMessageId: createIdGenerator({
              prefix: 'msg',
              size: 16,
            }),
            messageMetadata: ({ part }) => {
              if (part.type === 'start') {
                const createdAt = Date.now()
                return {
                  createdAt,
                  model: request.model,
                  providerId: request.provider,
                }
              }
              if (part.type === 'tool-call') {
                Sentry.startSpan(
                  {
                    name: 'Chat streaming metadata tool-call',
                    op: 'streaming.event',
                    attributes: {
                      'streaming.tool_name': part.toolName,
                    },
                  },
                  (startSpan) => {
                    startSpan.addLink({
                      context: span.spanContext(),
                      attributes: {
                        'sentry.link.type': 'previous_trace',
                      },
                    })
                  }
                )
              }
              if (part.type === 'file') {
                Sentry.startSpan(
                  {
                    name: 'Chat streaming metadata file',
                    op: 'streaming.event',
                    attributes: {
                      'streaming.file_type': part.type,
                    },
                  },
                  (startSpan) => {
                    startSpan.addLink({
                      context: span.spanContext(),
                      attributes: {
                        'sentry.link.type': 'previous_trace',
                      },
                    })
                  }
                )
              }
              if (part.type === 'finish') {
                const endTime = Date.now()
                const totalUsage = part.totalUsage
                const responseTime = endTime - startTime

                Sentry.startSpan(
                  {
                    name: 'Chat streaming metadata finish',
                    op: 'streaming.event',
                    attributes: {
                      'streaming.end_time_timestamp': new Date(
                        endTime
                      ).toISOString(),
                      ...(totalUsage
                        ? {
                            'streaming.output_ai_t': totalUsage.outputTokens,
                            'streaming.total_ai_t': totalUsage.totalTokens,
                            'streaming.reasoning_ai_t':
                              totalUsage.reasoningTokens,
                            'streaming.cached_input_ai_t':
                              totalUsage.cachedInputTokens,
                          }
                        : {}),
                      'streaming.response_time': responseTime,
                      'streaming.finish_reason': part.finishReason,
                    },
                  },
                  (startSpan) => {
                    startSpan.addLink({
                      context: span.spanContext(),
                      attributes: {
                        'sentry.link.type': 'previous_trace',
                      },
                    })
                  }
                )

                return {
                  ...(totalUsage ? { totalUsage } : {}),
                  responseTime: endTime - startTime,
                  finishReason: part.finishReason,
                }
              }
            },
            onFinish: async ({
              messages: finalMessages,
            }: {
              messages: UIMessage<{
                createdAt?: number
                model?: string
                totalUsage?: LanguageModelV2Usage
                responseTime?: number
                finishReason?: string
              }>[]
            }) => {
              finish()
              // Save the complete conversation when streaming finishes
              try {
                const result = updateThreadMessages(
                  request.chatId,
                  finalMessages
                )
                if (!result.success) {
                  log.error(
                    `[PERSISTENCE] Failed to save messages: ${result.error}`
                  )
                }
              } catch (saveError) {
                log.error(
                  '[CHAT] Failed to save messages to thread storage:',
                  saveError
                )
              }
            },
          })

          // Stream over IPC
          streamUIMessagesOverIPC(
            sender,
            streamId,
            uiMessageStream,
            async () => {
              // Clean up MCP clients after stream completes
              for (const client of mcpClients) {
                try {
                  await client.close()
                } catch (error) {
                  log.error('[CHAT] Error closing MCP client:', error)
                }
              }
            }
          )
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
  )
}
