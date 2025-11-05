import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createXai } from '@ai-sdk/xai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOllama } from 'ai-sdk-ollama'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import log from '../logger'
import { getChatSettings } from './settings-storage'
import {
  CHAT_PROVIDER_INFO,
  DEFAULT_OLLAMA_URL,
  DEFAULT_LMSTUDIO_URL,
  type ChatProviderInfo,
} from './constants'

// OpenRouter API interfaces
interface OpenRouterModel {
  id: string
  name: string
  description?: string
  context_length: number
  pricing: {
    prompt: string
    completion: string
  }
  top_provider: {
    context_length: number
    max_completion_tokens?: number
  }
  architecture?: {
    modality?: string
    tokenizer?: string
    instruct_type?: string
  }
  supported_parameters?: string[]
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[]
}

// Internal provider configuration with functions
// Discriminated union: Ollama and LM Studio use endpointURL, others use apiKey
type ChatProvider =
  | (ChatProviderInfo & {
      id: 'ollama' | 'lmstudio'
      createModel: (modelId: string, endpointURL: string) => LanguageModel
    })
  | (ChatProviderInfo & {
      id: Exclude<string, 'ollama' | 'lmstudio'>
      createModel: (modelId: string, apiKey: string) => LanguageModel
    })

// Internal provider configurations with model creation functions
export const CHAT_PROVIDERS: ChatProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: CHAT_PROVIDER_INFO.find((p) => p.id === 'openai')?.models || [],
    createModel: (modelId: string, apiKey: string) => {
      const openai = createOpenAI({ apiKey })
      return openai(modelId)
    },
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: CHAT_PROVIDER_INFO.find((p) => p.id === 'anthropic')?.models || [],
    createModel: (modelId: string, apiKey: string) => {
      const anthropic = createAnthropic({ apiKey })
      return anthropic(modelId)
    },
  },
  {
    id: 'google',
    name: 'Google',
    models: CHAT_PROVIDER_INFO.find((p) => p.id === 'google')?.models || [],
    createModel: (modelId: string, apiKey: string) => {
      const google = createGoogleGenerativeAI({ apiKey })
      return google(modelId)
    },
  },
  {
    id: 'xai',
    name: 'xAI',
    models: CHAT_PROVIDER_INFO.find((p) => p.id === 'xai')?.models || [],
    createModel: (modelId: string, apiKey: string) => {
      const xai = createXai({ apiKey })
      return xai(modelId)
    },
  },
  {
    id: 'ollama',
    name: 'Ollama',
    models: CHAT_PROVIDER_INFO.find((p) => p.id === 'ollama')?.models || [],
    createModel: (modelId: string, endpointURL: string) => {
      // For Ollama, endpointURL comes from ChatSettingsProvider.endpointURL
      // If empty or not a valid URL, default to DEFAULT_OLLAMA_URL
      const baseURL =
        endpointURL &&
        endpointURL.trim() &&
        (endpointURL.startsWith('http://') ||
          endpointURL.startsWith('https://'))
          ? endpointURL.trim()
          : DEFAULT_OLLAMA_URL

      log.info(
        `[CHAT] Creating Ollama model: ${modelId} with endpointURL: ${baseURL}`
      )

      const ollamaProvider = createOllama({ baseURL })
      return ollamaProvider(modelId)
    },
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    models: CHAT_PROVIDER_INFO.find((p) => p.id === 'lmstudio')?.models || [],
    createModel: (modelId: string, endpointURL: string) => {
      // For LM Studio, endpointURL comes from ChatSettingsProvider.endpointURL
      // If empty or not a valid URL, default to DEFAULT_LMSTUDIO_URL
      let rawURL =
        endpointURL &&
        endpointURL.trim() &&
        (endpointURL.startsWith('http://') ||
          endpointURL.startsWith('https://'))
          ? endpointURL.trim()
          : DEFAULT_LMSTUDIO_URL

      // Remove trailing slash if present
      rawURL = rawURL.replace(/\/$/, '')

      // LM Studio's OpenAI-compatible API is at /v1
      const baseURL = `${rawURL}/v1`

      log.info(
        `[CHAT] Creating LM Studio model: ${modelId} with baseURL: ${baseURL}`
      )

      const lmstudioProvider = createOpenAICompatible({
        name: 'lmstudio',
        baseURL,
      })
      return lmstudioProvider(modelId)
    },
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: CHAT_PROVIDER_INFO.find((p) => p.id === 'openrouter')?.models || [],
    createModel: (modelId: string, apiKey: string) => {
      // Validate API key format
      if (!apiKey || !apiKey.startsWith('sk-or-v1-')) {
        throw new Error(
          'OpenRouter API key must start with "sk-or-v1-". Please check your API key format.'
        )
      }

      const openrouter = createOpenRouter({ apiKey })
      return openrouter(modelId)
    },
  },
]

// Ollama API interfaces
interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details?: {
    parent_model?: string
    format?: string
    family?: string
    families?: string[]
    parameter_size?: string
    quantization_level?: string
  }
}

interface OllamaModelsResponse {
  models: OllamaModel[]
}

// Fetch available models from Ollama API
async function fetchOllamaModels(baseURL?: string): Promise<string[]> {
  if (!baseURL || !baseURL.trim()) {
    return []
  }

  try {
    const response = await fetch(`${baseURL}/api/tags`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      log.error('Failed to fetch Ollama models:', response.statusText)
      // Return empty array if API fails (Ollama not running or unreachable)
      return []
    }

    const data = (await response.json()) as OllamaModelsResponse

    // Extract model names from the response
    const models = data.models.map((model) => model.name)

    log.info(`[CHAT] Fetched ${models.length} models from Ollama at ${baseURL}`)
    return models
  } catch (error) {
    log.error('Error fetching Ollama models:', error)
    // Return empty array if API fails (Ollama not running or network error)
    return []
  }
}

// LM Studio API v1 interfaces
interface LMStudioModel {
  type: string
  publisher: string
  key: string
  display_name: string
  architecture?: string
  quantization?: {
    name: string
    bits_per_weight: number
  }
  size_bytes: number
  params_string?: string | null
  loaded_instances: Array<{
    id: string
    config: {
      context_length: number
    }
  }>
  max_context_length: number
  format: string
  capabilities?: {
    vision: boolean
    trained_for_tool_use: boolean
  }
  description?: string | null
  variants?: string[]
  selected_variant?: string
}

interface LMStudioModelsResponse {
  models: LMStudioModel[]
}

// Fetch available models from LM Studio API
async function fetchLMStudioModels(baseURL?: string): Promise<string[]> {
  if (!baseURL || !baseURL.trim()) {
    return []
  }

  try {
    const response = await fetch(`${baseURL}/api/v1/models`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      log.error('Failed to fetch LM Studio models:', response.statusText)
      return []
    }

    const data = (await response.json()) as LMStudioModelsResponse

    // Extract model keys from the response (filter out embedding models for chat)
    const models = data.models
      .filter((model) => model.type === 'llm' || model.type === 'vlm')
      .map((model) => model.key)

    log.info(
      `[CHAT] Fetched ${models.length} models from LM Studio at ${baseURL}`
    )
    return models
  } catch (error) {
    log.error('Error fetching LM Studio models:', error)
    return []
  }
}

// Fetch available models from OpenRouter API
async function fetchOpenRouterModels(): Promise<string[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      log.error('Failed to fetch OpenRouter models:', response.statusText)
      // Return fallback models if API fails
      return CHAT_PROVIDER_INFO.find((p) => p.id === 'openrouter')?.models || []
    }

    const data = (await response.json()) as OpenRouterModelsResponse

    // Filter and sort models by popularity/relevance
    const models = data.data
      .filter((model) => {
        // Filter out models that are likely not suitable for chat
        const modelId = model.id.toLowerCase()
        const isNotChatModel =
          modelId.includes('embedding') ||
          modelId.includes('whisper') ||
          modelId.includes('tts') ||
          modelId.includes('dall-e') ||
          modelId.includes('moderation') ||
          modelId.includes('audio')

        if (isNotChatModel) return false

        // Only include models that support tools/function calling
        const supportsTools =
          model.supported_parameters?.includes('tools') ||
          model.supported_parameters?.includes('functions') ||
          model.supported_parameters?.includes('function_call')

        return supportsTools
      })
      .map((model) => model.id)

    return models
  } catch (error) {
    log.error('Error fetching OpenRouter models:', error)
    // Return fallback models if API fails
    return CHAT_PROVIDER_INFO.find((p) => p.id === 'openrouter')?.models || []
  }
}

// Discover tool-supported models programmatically
export function discoverToolSupportedModels(): {
  providers: Array<{
    id: string
    name: string
    models: string[]
  }>
} {
  // Return the models that we know support tools based on our provider configurations
  return {
    providers: CHAT_PROVIDER_INFO.map((provider) => ({
      id: provider.id,
      name: provider.name,
      models: provider.models,
    })),
  }
}

export async function fetchProviderModelsHandler(
  providerId: string,
  tempCredential?: string
): Promise<{ id: string; name: string; models: string[] } | null> {
  if (providerId === 'ollama') {
    try {
      const baseURL =
        tempCredential && tempCredential.trim()
          ? tempCredential.trim()
          : DEFAULT_OLLAMA_URL

      const models = await fetchOllamaModels(baseURL)
      return {
        id: 'ollama',
        name: 'Ollama',
        models,
      }
    } catch (error) {
      log.error('Failed to fetch Ollama models:', error)
      return null
    }
  }

  if (providerId === 'lmstudio') {
    try {
      const baseURL =
        tempCredential && tempCredential.trim()
          ? tempCredential.trim()
          : DEFAULT_LMSTUDIO_URL

      const models = await fetchLMStudioModels(baseURL)
      return {
        id: 'lmstudio',
        name: 'LM Studio',
        models,
      }
    } catch (error) {
      log.error('Failed to fetch LM Studio models:', error)
      return null
    }
  }

  return null
}

export async function getAllProvidersHandler(): Promise<
  Array<{ id: string; name: string; models: string[] }>
> {
  const providers = [...CHAT_PROVIDER_INFO]

  const ollamaIndex = providers.findIndex((p) => p.id === 'ollama')
  if (ollamaIndex !== -1) {
    try {
      const ollamaSettings = getChatSettings('ollama')

      const baseURL =
        'endpointURL' in ollamaSettings
          ? ollamaSettings.endpointURL
          : DEFAULT_OLLAMA_URL

      const ollamaModels = await fetchOllamaModels(baseURL)
      const originalProvider = providers[ollamaIndex]
      if (originalProvider) {
        providers[ollamaIndex] = {
          id: originalProvider.id,
          name: originalProvider.name,
          models: ollamaModels,
        }
      }
    } catch (error) {
      log.error('Failed to fetch Ollama models:', error)
    }
  }

  const lmstudioIndex = providers.findIndex((p) => p.id === 'lmstudio')
  if (lmstudioIndex !== -1) {
    try {
      const lmstudioSettings = getChatSettings('lmstudio')

      const baseURL =
        'endpointURL' in lmstudioSettings
          ? lmstudioSettings.endpointURL
          : DEFAULT_LMSTUDIO_URL

      const lmstudioModels = await fetchLMStudioModels(baseURL)
      const originalProvider = providers[lmstudioIndex]
      if (originalProvider) {
        providers[lmstudioIndex] = {
          id: originalProvider.id,
          name: originalProvider.name,
          models: lmstudioModels,
        }
      }
    } catch (error) {
      log.error('Failed to fetch LM Studio models:', error)
    }
  }

  const openRouterIndex = providers.findIndex((p) => p.id === 'openrouter')
  if (openRouterIndex !== -1) {
    try {
      const openRouterSettings = getChatSettings('openrouter')

      if (
        'apiKey' in openRouterSettings &&
        typeof openRouterSettings.apiKey === 'string' &&
        openRouterSettings.apiKey.trim() !== ''
      ) {
        const openRouterModels = await fetchOpenRouterModels()
        const originalProvider = providers[openRouterIndex]
        if (originalProvider) {
          providers[openRouterIndex] = {
            id: originalProvider.id,
            name: originalProvider.name,
            models: openRouterModels,
          }
        }
      }
    } catch (error) {
      log.error('Failed to fetch OpenRouter models, using fallback:', error)
    }
  }

  return providers
}
