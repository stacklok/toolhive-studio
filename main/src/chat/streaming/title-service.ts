import { generateText, convertToModelMessages } from 'ai'
import { Effect } from 'effect'
import {
  extractThreadTitleText,
  fallbackTitleFromParts,
} from '@common/chat/thread-title'
import log from '../../logger'
import { LOCAL_PROVIDER_IDS } from '../constants'
import { CHAT_PROVIDERS } from '../providers/providers-catalog'
import { createModelFromRequest } from '../utils'
import type { ChatRequest, ChatUIMessage } from '../types'
import type { ChatSettingsThread } from '../threads/types'
import { ProviderError, ThreadNotFoundError } from '../runtime/errors'
import { ThreadsService } from '../threads/threads-service'
import { SettingsRepository } from '../settings/settings-service'
import { ThreadSettingsService } from '../settings/thread-settings-service'
import {
  isHollowAssistantMessage,
  sanitizeMessagesForModel,
} from './sanitize-messages-for-model'

const TITLE_SYSTEM_PROMPT =
  'You are a concise assistant. Summarize the following conversation in 6 words or fewer using title case. Reply with only the title — no punctuation, no quotes, no explanation.'

/**
 * Reasoning models (e.g. Moonshot Kimi via OpenRouter) spend max_tokens on
 * hidden thinking. Title calls are tiny — disable reasoning so the budget
 * goes to visible text. `effort: 'none'` satisfies the OpenRouter schema
 * which requires either `max_tokens` or `effort` alongside `enabled`.
 */
const OPENROUTER_TITLE_PROVIDER_OPTIONS = {
  openrouter: {
    reasoning: { enabled: false, effort: 'none' as const },
  },
}

function isLocalProvider(providerId: string): boolean {
  return LOCAL_PROVIDER_IDS.includes(
    providerId as (typeof LOCAL_PROVIDER_IDS)[number]
  )
}

function extractMessageText(message: ChatUIMessage): string {
  return extractThreadTitleText(message.parts ?? [])
}

function normalizeTitle(text: string): string {
  return text
    .trim()
    .replace(/[.!?]+$/, '')
    .trim()
}

export function fallbackTitleFromUser(userMsg: ChatUIMessage): string {
  return fallbackTitleFromParts(userMsg.parts ?? [])
}

/** Only auto-title the first assistant exchange in a thread. */
export function shouldAutoTitleThread(
  thread: ChatSettingsThread,
  userMsg: ChatUIMessage
): boolean {
  if (thread.titleEditedByUser) return false

  const assistantCount = thread.messages.filter(
    (m) => m.role === 'assistant' && !isHollowAssistantMessage(m)
  ).length
  if (assistantCount > 1) return false

  const userFallback = fallbackTitleFromUser(userMsg)
  const existingTitle = thread.title?.trim()
  if (existingTitle && existingTitle !== userFallback) return false

  return true
}

export class TitleService extends Effect.Service<TitleService>()(
  'chat/TitleService',
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const threads = yield* ThreadsService
      const settingsRepo = yield* SettingsRepository
      const threadSettings = yield* ThreadSettingsService

      return {
        generateThreadTitle: (threadId: string) =>
          Effect.gen(function* () {
            const thread = yield* threads.getThread(threadId)
            if (!thread) {
              return yield* Effect.fail(
                new ThreadNotFoundError({
                  threadId,
                  userMessage: 'Thread not found',
                })
              )
            }

            const userMsg = thread.messages.find((m) => m.role === 'user')
            if (!userMsg) {
              return yield* Effect.fail(
                new ProviderError({
                  providerId: 'title',
                  userMessage: 'No user message in thread',
                })
              )
            }

            const userFallback = fallbackTitleFromUser(userMsg)

            if (!shouldAutoTitleThread(thread, userMsg)) {
              return { title: thread.title ?? userFallback, updated: false }
            }

            // Skip empty/hollow assistants — some providers reject them, and
            // they add no signal for a short title summary.
            const nonHollowAssistant = thread.messages.find(
              (m) => m.role === 'assistant' && !isHollowAssistantMessage(m)
            )
            const assistantText = nonHollowAssistant
              ? extractMessageText(nonHollowAssistant)
              : ''
            const contextMessages = sanitizeMessagesForModel([
              userMsg,
              ...(nonHollowAssistant && assistantText
                ? [nonHollowAssistant]
                : []),
            ])

            const threadModel =
              yield* threadSettings.getThreadSelectedModel(threadId)
            const globalModel = yield* settingsRepo.readSelectedModel()
            const selected =
              threadModel?.provider && threadModel?.model
                ? threadModel
                : globalModel

            if (!selected.provider || !selected.model) {
              return yield* Effect.fail(
                new ProviderError({
                  providerId: 'title',
                  userMessage: 'No model selected',
                })
              )
            }

            const provider = CHAT_PROVIDERS.find(
              (p) => p.id === selected.provider
            )
            if (!provider) {
              return yield* Effect.fail(
                new ProviderError({
                  providerId: selected.provider,
                  userMessage: `Unknown provider: ${selected.provider}`,
                })
              )
            }

            const providerSettings = yield* settingsRepo.readProvider(
              selected.provider as Parameters<
                typeof settingsRepo.readProvider
              >[0]
            )
            if (!providerSettings) {
              return yield* Effect.fail(
                new ProviderError({
                  providerId: selected.provider,
                  userMessage: 'Provider settings not found',
                })
              )
            }

            const request = (
              isLocalProvider(selected.provider)
                ? {
                    chatId: threadId,
                    messages: contextMessages,
                    provider: selected.provider,
                    model: selected.model,
                    endpointURL: providerSettings.endpointURL ?? '',
                  }
                : {
                    chatId: threadId,
                    messages: contextMessages,
                    provider: selected.provider,
                    model: selected.model,
                    apiKey: providerSettings.apiKey ?? '',
                  }
            ) as ChatRequest

            const model = createModelFromRequest(provider, request)

            // Soft-fail the LLM call: reasoning models / flaky providers often
            // return empty text. We always prefer a user-message fallback over
            // leaving the UI stuck on "New chat".
            const llmText = yield* Effect.tryPromise({
              try: async () => {
                const { text } = await generateText({
                  model,
                  instructions: TITLE_SYSTEM_PROMPT,
                  messages: await convertToModelMessages(contextMessages),
                  // Small but enough for a 6-word title once reasoning is off.
                  maxOutputTokens: 64,
                  ...(selected.provider === 'openrouter'
                    ? { providerOptions: OPENROUTER_TITLE_PROVIDER_OPTIONS }
                    : {}),
                })
                return text
              },
              catch: (cause) =>
                new ProviderError({
                  providerId: selected.provider,
                  cause,
                  userMessage: 'Failed to generate thread title.',
                }),
            }).pipe(
              Effect.tapError((error) =>
                Effect.sync(() => {
                  log.warn(
                    `[TITLE] LLM title generation failed for ${threadId}:`,
                    error.userMessage,
                    error.cause ?? ''
                  )
                })
              ),
              Effect.catchTag('ProviderError', () => Effect.succeed(''))
            )

            const title = normalizeTitle(llmText) || userFallback
            if (!title) {
              return yield* Effect.fail(
                new ProviderError({
                  providerId: selected.provider,
                  userMessage: 'Empty title generated',
                })
              )
            }

            const latestThread = yield* threads.getThread(threadId)
            if (latestThread && !shouldAutoTitleThread(latestThread, userMsg)) {
              return {
                title: latestThread.title ?? userFallback,
                updated: false,
              }
            }

            if (latestThread?.title?.trim() === title) {
              return { title, updated: false }
            }

            yield* threads.updateThread(threadId, {
              title,
              titleEditedByUser: false,
            })
            return { title, updated: true }
          }),
      }
    }),
    dependencies: [
      ThreadsService.Default,
      SettingsRepository.Default,
      ThreadSettingsService.Default,
    ],
  }
) {}
