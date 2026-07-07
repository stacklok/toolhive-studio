// Default endpoint URLs for local server providers
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434'
export const DEFAULT_LMSTUDIO_URL = 'http://localhost:1234'

// Local server provider IDs
export const LOCAL_PROVIDER_IDS = ['ollama', 'lmstudio'] as const
export type LocalProviderId = (typeof LOCAL_PROVIDER_IDS)[number]

// Provider configuration for IPC (serializable)
export interface ChatProviderInfo {
  id: string
  name: string
  models: string[]
}

export const CHAT_PROVIDER_INFO: ChatProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      // GPT-5.5 (newest)
      'gpt-5.5',

      // GPT-5.4
      'gpt-5.4',
      'gpt-5.4-pro',
      'gpt-5.4-mini',
      'gpt-5.4-nano',

      // GPT-5.3
      'gpt-5.3-chat-latest',

      // GPT-5.2
      'gpt-5.2',
      'gpt-5.2-chat-latest',
      'gpt-5.2-pro',

      // GPT-5.1
      'gpt-5.1',
      'gpt-5.1-chat-latest',

      // GPT-5
      'gpt-5',
      'gpt-5-chat-latest',
      'gpt-5-mini',
      'gpt-5-nano',

      // GPT-4.1
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',

      // GPT-4o
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4o-audio-preview',
      'gpt-4o-mini-audio-preview',
      'gpt-4o-search-preview',
      'gpt-4o-mini-search-preview',

      // GPT-3.5 (legacy)
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-0125',
      'gpt-3.5-turbo-1106',
      'gpt-3.5-turbo-16k',

      // O-series reasoning models
      'o4-mini',
      'o3',
      'o3-mini',
      'o1',
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      // Claude 5 / 4.8 (newest)
      'claude-opus-4-8',
      'claude-sonnet-5',
      'claude-fable-5',

      // Claude 4.7
      'claude-opus-4-7',

      // Claude 4.6
      'claude-opus-4-6',
      'claude-sonnet-4-6',

      // Claude 4.5
      'claude-opus-4-5',
      'claude-sonnet-4-5',
      'claude-haiku-4-5',

      // Claude 4.1
      'claude-opus-4-1',

      // Claude 4.0
      'claude-opus-4-0',
      'claude-sonnet-4-0',

      // Claude 3 (legacy)
      'claude-3-haiku-20240307',
    ],
  },
  {
    id: 'google',
    name: 'Google',
    models: [
      // Latest aliases
      'gemini-pro-latest',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',

      // Gemini 3.5 (newest)
      'gemini-3.5-flash',

      // Gemini 3.1
      'gemini-3.1-pro-preview',
      'gemini-3.1-pro-preview-customtools',
      'gemini-3.1-flash-image-preview',
      'gemini-3.1-flash-lite-preview',
      'gemini-3.1-flash-tts-preview',

      // Gemini 3
      'gemini-3-pro-preview',
      'gemini-3-pro-image-preview',
      'gemini-3-flash-preview',

      // Gemini 2.5
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-image',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash-preview-tts',
      'gemini-2.5-pro-preview-tts',
      'gemini-2.5-flash-native-audio-latest',
      'gemini-2.5-computer-use-preview-10-2025',

      // Gemini 2.0
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',

      // Deep research
      'deep-research-pro-preview-12-2025',
      'deep-research-max-preview-04-2026',
      'deep-research-preview-04-2026',

      // Specialty
      'nano-banana-pro-preview',
      'gemini-robotics-er-1.5-preview',
      'aqa',

      // Gemma 3
      'gemma-3-27b-it',
      'gemma-3-12b-it',
      'gemma-3-4b-it',
      'gemma-3-1b-it',
      'gemma-3n-e4b-it',
      'gemma-3n-e2b-it',
    ],
  },
  {
    id: 'xai',
    name: 'xAI',
    models: [
      // Grok 4.20 (newest)
      'grok-4.20-reasoning',
      'grok-4.20-non-reasoning',

      // Grok 4.3
      'grok-4.3',

      // Latest alias
      'grok-latest',
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    models: [], // Models will be dynamically fetched from Ollama API
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    models: [], // Models will be dynamically fetched from LM Studio API
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: [
      // This will be dynamically populated from the API including all providers
      // Fallback models for when API is unavailable:

      // OpenAI models via OpenRouter
      'openai/gpt-5.5',
      'openai/gpt-5.4',
      'openai/gpt-5.4-pro',
      'openai/gpt-5.4-mini',
      'openai/gpt-5.4-nano',
      'openai/gpt-5.3-chat-latest',
      'openai/gpt-5.2',
      'openai/gpt-5.2-chat-latest',
      'openai/gpt-5.2-pro',
      'openai/gpt-5.1',
      'openai/gpt-5.1-chat-latest',
      'openai/gpt-5',
      'openai/gpt-5-chat-latest',
      'openai/gpt-5-mini',
      'openai/gpt-5-nano',
      'openai/gpt-4.1',
      'openai/gpt-4.1-mini',
      'openai/gpt-4.1-nano',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-4o-audio-preview',
      'openai/gpt-4o-mini-audio-preview',
      'openai/gpt-4o-search-preview',
      'openai/gpt-4o-mini-search-preview',
      'openai/gpt-3.5-turbo',
      'openai/gpt-3.5-turbo-0125',
      'openai/gpt-3.5-turbo-1106',
      'openai/gpt-3.5-turbo-16k',
      'openai/o4-mini',
      'openai/o3',
      'openai/o3-mini',
      'openai/o1',

      // Anthropic models via OpenRouter
      'anthropic/claude-opus-4-8',
      'anthropic/claude-sonnet-5',
      'anthropic/claude-fable-5',
      'anthropic/claude-opus-4-7',
      'anthropic/claude-opus-4-6',
      'anthropic/claude-sonnet-4-6',
      'anthropic/claude-opus-4-5',
      'anthropic/claude-sonnet-4-5',
      'anthropic/claude-haiku-4-5',
      'anthropic/claude-opus-4-1',
      'anthropic/claude-opus-4-0',
      'anthropic/claude-sonnet-4-0',
      'anthropic/claude-3-haiku-20240307',

      // Google models via OpenRouter
      'google/gemini-pro-latest',
      'google/gemini-flash-latest',
      'google/gemini-flash-lite-latest',
      'google/gemini-3.5-flash',
      'google/gemini-3.1-pro-preview',
      'google/gemini-3.1-pro-preview-customtools',
      'google/gemini-3.1-flash-image-preview',
      'google/gemini-3.1-flash-lite-preview',
      'google/gemini-3.1-flash-tts-preview',
      'google/gemini-3-pro-preview',
      'google/gemini-3-pro-image-preview',
      'google/gemini-3-flash-preview',
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-flash-image',
      'google/gemini-2.5-flash-lite',
      'google/gemini-2.5-flash-preview-tts',
      'google/gemini-2.5-pro-preview-tts',
      'google/gemini-2.5-flash-native-audio-latest',
      'google/gemini-2.5-computer-use-preview-10-2025',
      'google/gemini-2.0-flash',
      'google/gemini-2.0-flash-lite',
      'google/deep-research-pro-preview-12-2025',
      'google/deep-research-max-preview-04-2026',
      'google/deep-research-preview-04-2026',
      'google/nano-banana-pro-preview',
      'google/gemini-robotics-er-1.5-preview',
      'google/aqa',
      'google/gemma-3-27b-it',
      'google/gemma-3-12b-it',
      'google/gemma-3-4b-it',
      'google/gemma-3-1b-it',
      'google/gemma-3n-e4b-it',
      'google/gemma-3n-e2b-it',

      // xAI models via OpenRouter
      'xai/grok-4.20-reasoning',
      'xai/grok-4.20-non-reasoning',
      'xai/grok-4.3',
      'xai/grok-latest',

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
] as const satisfies ChatProviderInfo[]
