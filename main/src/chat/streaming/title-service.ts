import { generateText, convertToModelMessages } from 'ai'
import { Effect } from 'effect'
import { LOCAL_PROVIDER_IDS } from '../constants'
import { CHAT_PROVIDERS } from '../providers/providers-catalog'
import { createModelFromRequest } from '../utils'
import type { ChatRequest } from '../types'
import { ProviderError, ThreadNotFoundError } from '../runtime/errors'
import { ThreadsService } from '../threads/threads-service'
import { SettingsRepository } from '../settings/settings-service'

const TITLE_SYSTEM_PROMPT =
  'You are a concise assistant. Summarize the following conversation in 6 words or fewer using title case. Reply with only the title — no punctuation, no quotes, no explanation.'

function isLocalProvider(providerId: string): boolean {
  return LOCAL_PROVIDER_IDS.includes(
    providerId as (typeof LOCAL_PROVIDER_IDS)[number]
  )
}

export class TitleService extends Effect.Service<TitleService>()(
  'chat/TitleService',
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const threads = yield* ThreadsService
      const settingsRepo = yield* SettingsRepository

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
            const assistantMsg = thread.messages.find(
              (m) => m.role === 'assistant'
            )
            if (!userMsg) {
              return yield* Effect.fail(
                new ProviderError({
                  providerId: 'title',
                  userMessage: 'No user message in thread',
                })
              )
            }
            const contextMessages = [
              userMsg,
              ...(assistantMsg ? [assistantMsg] : []),
            ]

            const selected = yield* settingsRepo.readSelectedModel()
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

            const { text } = yield* Effect.tryPromise({
              try: async () =>
                generateText({
                  model,
                  instructions: TITLE_SYSTEM_PROMPT,
                  messages: await convertToModelMessages(contextMessages),
                  maxOutputTokens: 20,
                }),
              catch: (cause) =>
                new ProviderError({
                  providerId: selected.provider,
                  cause,
                  userMessage: 'Failed to generate thread title.',
                }),
            })

            const title = text
              .trim()
              .replace(/[.!?]+$/, '')
              .trim()
            if (!title) {
              return yield* Effect.fail(
                new ProviderError({
                  providerId: selected.provider,
                  userMessage: 'Empty title generated',
                })
              )
            }

            const latestThread = yield* threads.getThread(threadId)
            if (latestThread?.titleEditedByUser) {
              return { title: latestThread.title }
            }

            yield* threads.updateThread(threadId, {
              title,
              titleEditedByUser: false,
            })
            return { title }
          }),
      }
    }),
    dependencies: [ThreadsService.Default, SettingsRepository.Default],
  }
) {}
