import {
  ToolLoopAgent,
  stepCountIs,
  type UIMessage,
  convertToModelMessages,
  createIdGenerator,
} from 'ai'
import * as Sentry from '@sentry/electron/main'
import type { LanguageModelV2Usage } from '@ai-sdk/provider'
import log from '../logger'
import { CHAT_PROVIDERS } from './providers'
import { createMcpTools, getCachedUiMetadata } from './mcp-tools'
import { streamUIMessagesOverIPC } from './stream-utils'
import type { ChatRequest } from './types'
import { updateThreadMessages } from './threads-storage'
import { createModelFromRequest } from './utils'
import { getAgent, resolveAgentForThread } from './agents/registry'
import { createBuiltinAgentTools } from './agents/builtin-agent-tools'

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
        agent_id: request.agentId ?? '',
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
        const model = createModelFromRequest(provider, request)

        // Resolve the agent for this request. Prefer the id on the request
        // (selected in the UI), then the thread's stored agent, then default.
        const agentConfig = request.agentId
          ? (getAgent(request.agentId) ?? resolveAgentForThread(request.chatId))
          : resolveAgentForThread(request.chatId)

        // Get MCP tools if enabled
        const {
          tools: mcpTools,
          clients: mcpClients,
          enabledTools,
        } = await createMcpTools()

        // Agent-specific built-in tools (e.g. Skills Builder)
        const builtinToolsHandle = createBuiltinAgentTools(
          agentConfig.builtinToolsKey ?? null
        )
        const builtinTools = builtinToolsHandle.tools

        // Emit UI metadata so the renderer can identify MCP App tools
        sender.send('chat:stream:tool-ui-metadata', getCachedUiMetadata())

        const combinedTools = {
          ...mcpTools,
          ...builtinTools,
        }
        const hasTools = Object.keys(combinedTools).length > 0

        try {
          const agent = new ToolLoopAgent({
            model,
            instructions: agentConfig.instructions,
            tools: hasTools ? combinedTools : undefined,
            toolChoice: hasTools ? 'auto' : undefined,
            stopWhen: stepCountIs(50),
          })

          const result = await agent.stream({
            messages: await convertToModelMessages(request.messages),
          })

          // Create UI message stream with metadata and persistence
          const startTime = Date.now()
          Sentry.startSpan(
            {
              name: 'Chat streaming start',
              op: 'streaming.event',
              attributes: {
                'streaming.start_timestamp': new Date(startTime).toISOString(),
                'streaming.agent_id': agentConfig.id,
                'streaming.agent_kind': agentConfig.kind,
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
              // Clean up any agent-owned temp resources (e.g. Skills workdirs)
              try {
                await builtinToolsHandle.cleanup()
              } catch (error) {
                log.error(
                  '[CHAT] Error cleaning up builtin agent tools:',
                  error
                )
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
          try {
            await builtinToolsHandle.cleanup()
          } catch (cleanupError) {
            log.error(
              '[CHAT] Error cleaning up builtin agent tools during error cleanup:',
              cleanupError
            )
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
