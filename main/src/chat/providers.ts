import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createXai } from '@ai-sdk/xai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOllama } from 'ai-sdk-ollama'
import type { LanguageModel } from 'ai'
import log from '../logger'

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

// Provider configuration for IPC (serializable)
interface ChatProviderInfo {
  id: string
  name: string
  models: string[]
}

// Internal provider configuration with functions
interface ChatProvider extends ChatProviderInfo {
  createModel: (modelId: string, apiKey: string) => LanguageModel
}

// Serializable provider info for the renderer
export const CHAT_PROVIDER_INFO: ChatProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      // GPT series
      'gpt-5',
      'gpt-5-nano',
      'gpt-5-mini',
      'gpt-5-reasoning',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-oss-20b',
      'gpt-oss-120b',
      'gpt-imagegen',
      // O-series reasoning models
      'o3',
      'o3-mini',
      'o3-pro',
      'o4-mini',
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      // Claude 4 models (newest)
      'claude-sonnet-4-5',
      'claude-opus-4-1',
      'claude-sonnet-4-0',
      'claude-opus-4-0',

      // Claude 3.7 models
      'claude-3-7-sonnet-latest',
      'claude-3-7-sonnet-20250219',

      // Claude 3.5 models (current generation)
      'claude-3-5-sonnet-latest',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620',
      'claude-3-5-haiku-latest',
      'claude-3-5-haiku-20241022',

      // Claude 3 models (previous generation)
      'claude-3-opus-latest',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
  },
  {
    id: 'google',
    name: 'Google',
    models: [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash-thinking',
      'gemini-2.5-flash-lite-thinking',
      'gemini-imagen-4',
      'gemini-imagen-4-ultra',
    ],
  },
  {
    id: 'xai',
    name: 'xAI',
    models: ['grok-4', 'grok-3', 'grok-3-mini'],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    models: [], // Models will be dynamically fetched from Ollama API
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      // This will be dynamically populated from the API including all providers
      // Fallback models for when API is unavailable:

      // OpenAI models via OpenRouter
      'openai/gpt-5-chat',
      'openai/gpt-5-mini',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-4.1',
      'openai/gpt-4.1-mini',
      'openai/gpt-4.1-nano',
      'openai/o3',
      'openai/o3-mini',
      'openai/o3-pro',
      'openai/o4-mini',

      // Anthropic models via OpenRouter
      'anthropic/claude-3.5-sonnet:beta',
      'anthropic/claude-3-5-sonnet-20241022',
      'anthropic/claude-3-5-haiku-20241022',
      'anthropic/claude-3-opus-20240229',
      'anthropic/claude-3-sonnet-20240229',
      'anthropic/claude-3-haiku-20240307',

      // Google models via OpenRouter
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-flash-lite',
      'google/gemini-2.0-flash',
      'google/gemini-2.0-flash-lite',
      'google/gemini-2.5-flash-thinking',
      'google/gemini-2.5-flash-lite-thinking',

      // xAI models via OpenRouter
      'xai/grok-4',
      'xai/grok-3',
      'xai/grok-3-mini',

      // Meta (Llama) models
      'meta-llama/llama-3.3-70b-instruct',
      'meta-llama/llama-4-scout',
      'meta-llama/llama-4-maverick',

      // DeepSeek models
      'deepseek/deepseek-r1-llama-distilled',
      'deepseek/deepseek-v3-fireworks',
      'deepseek/deepseek-v3-0324',
      'deepseek/deepseek-r1-openrouter',
      'deepseek/deepseek-r1-0528',
      'deepseek/deepseek-r1-qwen-distilled',

      // Alibaba (Qwen) models
      'qwen/qwen-2.5-32b-instruct',
      'qwen/qwen3-32b',
      'qwen/qwen3-235b-thinking',
      'qwen/qwen3-235b',
      'qwen/qwen3-coder',

      // Moonshot AI (Kimi) models
      'moonshot/kimi-k2',

      // Zhipu AI (GLM) models
      'zhipuai/glm-4.5',
      'zhipuai/glm-4.5-thinking',
    ],
  },
]

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
    createModel: (modelId: string, apiKey: string) => {
      // For Ollama, the apiKey field can be used to specify a custom base URL
      // If empty or not a URL, default to localhost:11434
      const baseURL =
        apiKey &&
        (apiKey.startsWith('http://') || apiKey.startsWith('https://'))
          ? apiKey
          : 'http://localhost:11434'

      log.info(
        `[CHAT] Creating Ollama model: ${modelId} with baseURL: ${baseURL}`
      )

      const ollamaProvider = createOllama({ baseURL })
      return ollamaProvider(modelId)
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
export async function fetchOllamaModels(
  baseURL = 'http://localhost:11434'
): Promise<string[]> {
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

// Fetch available models from OpenRouter API
export async function fetchOpenRouterModels(): Promise<string[]> {
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
