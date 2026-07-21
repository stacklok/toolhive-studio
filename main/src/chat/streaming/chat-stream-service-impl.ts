import {
  ToolLoopAgent,
  isStepCount,
  type LanguageModelUsage,
  convertToModelMessages,
  createIdGenerator,
  toUIMessageStream,
} from 'ai'
import * as Sentry from '@sentry/electron/main'
import type { WebContents } from 'electron'
import { Effect } from 'effect'
import log from '../../logger'
import { CHAT_PROVIDERS } from '../providers/providers-catalog'
import type { ChatRequest } from '../types'
import { createModelFromRequest } from '../utils'
import { addUsage, getCacheReadTokens, getReasoningTokens } from '../usage'
import { toUserFacingProviderMessage } from '../runtime/errors'
import { AgentsService } from '../agents/agents-service'
import { McpService } from '../mcp/mcp-service'
import { StreamRegistryService } from './stream-registry-service'
import { createBuiltinAgentTools } from '../agents/builtin-agent-tools'
import { sanitizeMessagesForModel } from './sanitize-messages-for-model'
import { generateThreadTitle } from '../generate-thread-title'
import { broadcastThreadUpdated } from './stream-registry-broadcast'

/** Gemini's function-declaration validator rejects schema constructs other
 * providers accept. True for Google directly or a `google/*` OpenRouter model. */
function requiresGeminiSchemaCompat(provider: string, model: string): boolean {
  return provider === 'google' || model.toLowerCase().startsWith('google/')
}

/**
 * Handle chat streaming request using real-time IPC events
 */
export async function handleChatStreamRealtime(
  deps: {
    agents: Effect.Effect.Success<typeof AgentsService>
    mcp: Effect.Effect.Success<typeof McpService>
    registry: Effect.Effect.Success<typeof StreamRegistryService>
  },
  request: ChatRequest,
  streamId: string,
  sender: WebContents
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
        const provider = CHAT_PROVIDERS.find(
          (p: (typeof CHAT_PROVIDERS)[number]) => p.id === request.provider
        )
        if (!provider) {
          throw new Error(`Unknown provider: ${request.provider}`)
        }

        // Create AI model using type guards for discriminated union
        const model = createModelFromRequest(provider, request)

        // Resolve the agent for this request. Prefer the id on the request
        // (selected in the UI), then the thread's stored agent, then default.
        const agentConfig = request.agentId
          ? ((await Effect.runPromise(deps.agents.getAgent(request.agentId))) ??
            (await Effect.runPromise(
              deps.agents.resolveAgentForThread(request.chatId)
            )))
          : await Effect.runPromise(
              deps.agents.resolveAgentForThread(request.chatId)
            )

        const {
          tools: mcpTools,
          clients: mcpClients,
          enabledTools,
        } = await Effect.runPromise(
          deps.mcp.createMcpTools(request.chatId, {
            sanitizeSchemas: requiresGeminiSchemaCompat(
              request.provider,
              request.model
            ),
          })
        )

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
            stopWhen: isStepCount(50),
            // Persisted threads may include legacy `{ role: 'system' }` messages.
            allowSystemInMessages: true,
          })

          const result = await agent.stream({
            messages: await convertToModelMessages(
              sanitizeMessagesForModel(request.messages)
            ),
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
          let runningUsage: LanguageModelUsage | null = null

          const uiMessageStream = toUIMessageStream({
            stream: result.stream,
            originalMessages: request.messages,
            generateMessageId: createIdGenerator({
              prefix: 'msg',
              size: 16,
            }),
            onError: (error) => toUserFacingProviderMessage(error),
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
                runningUsage = addUsage(runningUsage, part.usage)
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
                              getReasoningTokens(totalUsage),
                            'streaming.cached_input_ai_t':
                              getCacheReadTokens(totalUsage),
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
          })

          await Effect.runPromise(
            deps.registry.runManagedStream({
              chatId: request.chatId,
              streamId,
              originalMessages: request.messages,
              uiMessageStream,
              abortController,
              initialSender: sender,
              initialToolUiMetadata: Effect.runSync(
                deps.mcp.getCachedUiMetadata()
              ),
              onComplete: async ({ status }) => {
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
                // Only auto-title successful finishes — aborted/errored
                // streams would waste tokens on a user-only transcript.
                if (status !== 'finished') return
                try {
                  const result = await generateThreadTitle(request.chatId)
                  if (!result.success) {
                    log.warn(
                      `[CHAT] Auto-title failed for ${request.chatId}:`,
                      result.error
                    )
                    return
                  }
                  // Only refresh when SQLite actually changed — skip no-ops
                  // (manual title, unchanged title, second-turn skip).
                  if (result.updated) {
                    broadcastThreadUpdated(request.chatId)
                  }
                } catch (error) {
                  log.warn(
                    `[CHAT] Auto-title threw for ${request.chatId}:`,
                    error
                  )
                }
              },
            })
          )
          finish()
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

          throw new Error(toUserFacingProviderMessage(error))
        }
      } catch (error) {
        log.error('[CHAT] Chat stream error:', error)
        // Outer catch covers setup failures (agent/MCP/builtin tools) that
        // never enter the inner try. Domain TaggedErrors often have empty
        // `.message`, so map through userMessage the same as the inner path.
        throw new Error(toUserFacingProviderMessage(error))
      }
    }
  )
}
