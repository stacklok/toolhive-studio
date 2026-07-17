import { Duration, Effect, Schedule } from 'effect'
import log from '../../logger'
import {
  CHAT_PROVIDER_INFO,
  DEFAULT_LMSTUDIO_URL,
  DEFAULT_OLLAMA_URL,
} from '../constants'
import { CHAT_PROVIDERS } from './providers-catalog'
import { ProviderError } from '../runtime/errors'
import { SettingsService } from '../settings/settings-service'

function discoverToolSupportedModels(): {
  providers: Array<{
    id: string
    name: string
    models: string[]
  }>
} {
  return {
    providers: CHAT_PROVIDER_INFO.map((provider) => ({
      id: provider.id,
      name: provider.name,
      models: provider.models,
    })),
  }
}

async function fetchOllamaModels(baseURL?: string): Promise<string[]> {
  if (!baseURL || !baseURL.trim()) return []
  const response = await fetch(`${baseURL}/api/tags`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch Ollama models: ${response.statusText}`)
  }
  const data = (await response.json()) as { models: Array<{ name: string }> }
  return data.models.map((model) => model.name)
}

async function fetchLMStudioModels(baseURL?: string): Promise<string[]> {
  if (!baseURL || !baseURL.trim()) return []
  const response = await fetch(`${baseURL}/api/v1/models`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch LM Studio models: ${response.statusText}`)
  }
  const data = (await response.json()) as {
    models: Array<{ type: string; key: string }>
  }
  return data.models
    .filter((model) => model.type === 'llm' || model.type === 'vlm')
    .map((model) => model.key)
}

async function fetchOpenRouterModels(): Promise<string[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    return CHAT_PROVIDER_INFO.find((p) => p.id === 'openrouter')?.models || []
  }
  const data = (await response.json()) as {
    data: Array<{
      id: string
      supported_parameters?: string[]
    }>
  }
  return data.data
    .filter((model) => {
      const modelId = model.id.toLowerCase()
      const isNotChatModel =
        modelId.includes('embedding') ||
        modelId.includes('whisper') ||
        modelId.includes('tts') ||
        modelId.includes('dall-e') ||
        modelId.includes('moderation') ||
        modelId.includes('audio')
      if (isNotChatModel) return false
      return (
        model.supported_parameters?.includes('tools') ||
        model.supported_parameters?.includes('functions') ||
        model.supported_parameters?.includes('function_call')
      )
    })
    .map((model) => model.id)
}

export class ProvidersService extends Effect.Service<ProvidersService>()(
  'chat/ProvidersService',
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const settings = yield* SettingsService

      return {
        getChatProviders: () => Effect.succeed(CHAT_PROVIDERS),

        discoverToolSupportedModels: () =>
          Effect.succeed(discoverToolSupportedModels()),

        fetchProviderModels: (providerId: string, tempCredential?: string) =>
          Effect.tryPromise({
            try: async () => {
              if (providerId === 'ollama') {
                const baseURL =
                  tempCredential && tempCredential.trim()
                    ? tempCredential.trim()
                    : DEFAULT_OLLAMA_URL
                const models = await fetchOllamaModels(baseURL)
                return { id: 'ollama', name: 'Ollama', models }
              }
              if (providerId === 'lmstudio') {
                const baseURL =
                  tempCredential && tempCredential.trim()
                    ? tempCredential.trim()
                    : DEFAULT_LMSTUDIO_URL
                const models = await fetchLMStudioModels(baseURL)
                return { id: 'lmstudio', name: 'LM Studio', models }
              }
              return null
            },
            catch: (cause) =>
              new ProviderError({
                providerId,
                cause,
                userMessage: 'Failed to discover provider models.',
              }),
          }).pipe(
            Effect.retry(
              Schedule.exponential(Duration.millis(200)).pipe(
                Schedule.compose(Schedule.recurs(2))
              )
            ),
            Effect.catchAll(() => Effect.succeed(null))
          ),

        getAllProviders: () =>
          Effect.gen(function* () {
            const providers = [...CHAT_PROVIDER_INFO] as Array<{
              id: string
              name: string
              models: string[]
            }>

            const ollamaIndex = providers.findIndex((p) => p.id === 'ollama')
            if (ollamaIndex !== -1) {
              const ollamaSettings = yield* settings.getChatSettings('ollama')
              const baseURL =
                'endpointURL' in ollamaSettings
                  ? ollamaSettings.endpointURL
                  : DEFAULT_OLLAMA_URL
              try {
                const ollamaModels = yield* Effect.tryPromise({
                  try: () => fetchOllamaModels(baseURL),
                  catch: (cause) => cause,
                })
                const original = providers[ollamaIndex]
                if (original) {
                  providers[ollamaIndex] = {
                    id: original.id,
                    name: original.name,
                    models: ollamaModels,
                  }
                }
              } catch (error) {
                log.error('Failed to fetch Ollama models:', error)
              }
            }

            const lmstudioIndex = providers.findIndex(
              (p) => p.id === 'lmstudio'
            )
            if (lmstudioIndex !== -1) {
              const lmstudioSettings =
                yield* settings.getChatSettings('lmstudio')
              const baseURL =
                'endpointURL' in lmstudioSettings
                  ? lmstudioSettings.endpointURL
                  : DEFAULT_LMSTUDIO_URL
              try {
                const lmstudioModels = yield* Effect.tryPromise({
                  try: () => fetchLMStudioModels(baseURL),
                  catch: (cause) => cause,
                })
                const original = providers[lmstudioIndex]
                if (original) {
                  providers[lmstudioIndex] = {
                    id: original.id,
                    name: original.name,
                    models: lmstudioModels,
                  }
                }
              } catch (error) {
                log.error('Failed to fetch LM Studio models:', error)
              }
            }

            const openRouterIndex = providers.findIndex(
              (p) => p.id === 'openrouter'
            )
            if (openRouterIndex !== -1) {
              const openRouterSettings =
                yield* settings.getChatSettings('openrouter')
              if (
                'apiKey' in openRouterSettings &&
                typeof openRouterSettings.apiKey === 'string' &&
                openRouterSettings.apiKey.trim() !== ''
              ) {
                try {
                  const openRouterModels = yield* Effect.tryPromise({
                    try: () => fetchOpenRouterModels(),
                    catch: (cause) => cause,
                  })
                  const original = providers[openRouterIndex]
                  if (original) {
                    providers[openRouterIndex] = {
                      id: original.id,
                      name: original.name,
                      models: openRouterModels,
                    }
                  }
                } catch (error) {
                  log.error(
                    'Failed to fetch OpenRouter models, using fallback:',
                    error
                  )
                }
              }
            }

            return providers
          }),
      }
    }),
    dependencies: [SettingsService.Default],
  }
) {}
