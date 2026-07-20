import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createXai } from '@ai-sdk/xai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOllama } from 'ai-sdk-ollama'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import log from '../../logger'
import {
  CHAT_PROVIDER_INFO,
  DEFAULT_OLLAMA_URL,
  DEFAULT_LMSTUDIO_URL,
} from '../constants'
import type { ChatProvider } from '../types'

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
      const google = createGoogle({ apiKey })
      return google(modelId)
    },
  },
  {
    id: 'xai',
    name: 'xAI',
    models: CHAT_PROVIDER_INFO.find((p) => p.id === 'xai')?.models || [],
    createModel: (modelId: string, apiKey: string) => {
      const xai = createXai({ apiKey })
      // AI SDK v7 defaults xai() to the Responses API; keep Chat Completions.
      return xai.chat(modelId)
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
