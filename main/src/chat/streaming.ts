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
import { runManagedStream } from './active-streams'
import type { ChatRequest } from './types'
import { updateThreadMessages } from './threads-storage'
import { createModelFromRequest } from './utils'
import { getAgent, resolveAgentForThread } from './agents/registry'
import { createBuiltinAgentTools } from './agents/builtin-agent-tools'

/** Sum two optional token counts, returning undefined only when both are. */
function addCount(
  a: number | undefined,
  b: number | undefined
): number | undefined {
  if (a == null && b == null) return undefined
  return (a ?? 0) + (b ?? 0)
}

/** Accumulate per-step usage into a running total. The right-hand value
 * has the AI SDK's `LanguageModelUsage` shape but we use the
 * `LanguageModelV2Usage` keys we already persist in message metadata. */
function addUsage(
  acc: LanguageModelV2Usage | null,
  next: LanguageModelV2Usage | undefined | null
): LanguageModelV2Usage | null {
  if (!next) return acc
  if (!acc) return { ...next }
  return {
    ...acc,
    inputTokens: addCount(acc.inputTokens, next.inputTokens),
    outputTokens: addCount(acc.outputTokens, next.outputTokens),
    totalTokens: addCount(acc.totalTokens, next.totalTokens),
    reasoningTokens: addCount(acc.reasoningTokens, next.reasoningTokens),
    cachedInputTokens: addCount(acc.cachedInputTokens, next.cachedInputTokens),
  } as LanguageModelV2Usage
}

/** Gemini's function-declaration validator rejects schema constructs other
 * providers accept. True for Google directly or a `google/*` OpenRouter model. */
function requiresGeminiSchemaCompat(provider: string, model: string): boolean {
  return provider === 'google' || model.toLowerCase().startsWith('google/')
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string') return message
  }
  return ''
}

/** Map provider/SDK errors to user-facing messages for the playground UI. */
function toUserFacingErrorMessage(error: unknown): string {
  const message = getErrorMessage(error)
  if (/overloaded/i.test(message)) {
    return 'The AI service is currently overloaded. Please try again in a few moments.'
  }
  if (/rate limit/i.test(message)) {
    return 'Rate limit exceeded. Please wait a moment before sending another message.'
  }
  if (/insufficient_quota|quota/i.test(message)) {
    return 'API quota exceeded. Please check your API key billing status.'
  }
  if (/invalid_api_key|authentication/i.test(message)) {
    return 'Invalid API key. Please check your API key configuration.'
  }
  return message || 'An error occurred.'
}

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
      const abortController = new AbortController()

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

        // Get MCP tools if enabled (per-thread when chatId is given)
        const {
          tools: mcpTools,
          clients: mcpClients,
          enabledTools,
        } = await createMcpTools(request.chatId, {
          sanitizeSchemas: requiresGeminiSchemaCompat(
            request.provider,
            request.model
          ),
        })

        // Agent-specific built-in tools (e.g. Skills Builder, Skill Tester).
        // Pass the threadId so per-thread skill enablement is honoured.
        const builtinToolsHandle = await createBuiltinAgentTools(
          agentConfig.builtinToolsKey ?? null,
          { threadId: request.chatId }
        )
        const builtinTools = builtinToolsHandle.tools

        const combinedTools = {
          ...mcpTools,
          ...builtinTools,
        }
        const hasTools = Object.keys(combinedTools).length > 0

        // Some bundles (e.g. the skills bundle) augment the agent's
        // instructions with runtime data such as the list of installed skills,
        // following the Vercel "Add Skills to Your Agent" progressive-
        // disclosure pattern.
        const instructions = builtinToolsHandle.instructionsSuffix
          ? `${agentConfig.instructions}\n\n${builtinToolsHandle.instructionsSuffix}`
          : agentConfig.instructions

        try {
          const agent = new ToolLoopAgent({
            model,
            instructions,
            tools: hasTools ? combinedTools : undefined,
            toolChoice: hasTools ? 'auto' : undefined,
            stopWhen: stepCountIs(50),
          })

          const result = await agent.stream({
            messages: await convertToModelMessages(request.messages),
            abortSignal: abortController.signal,
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

          // Running token-usage accumulator. Multi-step tool loops
          // emit one `finish-step` per step; we sum these so the running
          // assistant message metadata exposes a live `totalUsage` value
          // that the UI renders before the final `finish` chunk arrives.
          let runningUsage: LanguageModelV2Usage | null = null

          // Use the AI SDK's built-in UI message stream
          const uiMessageStream = result.toUIMessageStream({
            originalMessages: request.messages,
            generateMessageId: createIdGenerator({
              prefix: 'msg',
              size: 16,
            }),
            onError: (error) => toUserFacingErrorMessage(error),
            messageMetadata: ({ part }) => {
              if (part.type === 'start') {
                const createdAt = Date.now()
                return {
                  createdAt,
                  model: request.model,
                  providerId: request.provider,
                }
              }
              if (part.type === 'finish-step') {
                runningUsage = addUsage(
                  runningUsage,
                  part.usage as unknown as LanguageModelV2Usage
                )
                return {
                  ...(runningUsage ? { totalUsage: runningUsage } : {}),
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

          // Drive the stream through the active-streams registry so
          // chunks are buffered and broadcast to any current/future
          // subscribers, and snapshots are persisted to SQLite.
          await runManagedStream({
            chatId: request.chatId,
            streamId,
            originalMessages: request.messages,
            uiMessageStream,
            abortController,
            initialSender: sender,
            initialToolUiMetadata: getCachedUiMetadata(),
            onComplete: async () => {
              for (const client of mcpClients) {
                try {
                  await client.close()
                } catch (error) {
                  log.error('[CHAT] Error closing MCP client:', error)
                }
              }
              try {
                await builtinToolsHandle.cleanup()
              } catch (error) {
                log.error(
                  '[CHAT] Error cleaning up builtin agent tools:',
                  error
                )
              }
            },
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
          try {
            await builtinToolsHandle.cleanup()
          } catch (cleanupError) {
            log.error(
              '[CHAT] Error cleaning up builtin agent tools during error cleanup:',
              cleanupError
            )
          }

          throw new Error(toUserFacingErrorMessage(error))
        }
      } catch (error) {
        log.error('[CHAT] Chat stream error:', error)
        throw error
      }
    }
  )
}
