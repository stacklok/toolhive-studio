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
      // GPT-5.4 (newest)
      'gpt-5.4',
      'gpt-5.4-pro',
      'gpt-5.4-mini',
      'gpt-5.4-nano',

      // GPT-5.3
      'gpt-5.3-chat-latest',
      'gpt-5.3-codex',

      // GPT-5.2
      'gpt-5.2',
      'gpt-5.2-chat-latest',
      'gpt-5.2-pro',
      'gpt-5.2-codex',

      // GPT-5.1
      'gpt-5.1',
      'gpt-5.1-chat-latest',
      'gpt-5.1-codex',
      'gpt-5.1-codex-mini',
      'gpt-5.1-codex-max',

      // GPT-5
      'gpt-5',
      'gpt-5-chat-latest',
      'gpt-5-codex',
      'gpt-5-pro',
      'gpt-5-mini',
      'gpt-5-nano',

      // GPT-4.1
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',

      // GPT-4o
      'gpt-4o',
      'gpt-4o-mini',

      // GPT-3.5 (legacy)
      'gpt-3.5-turbo',

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
      // Claude 4.7 (newest)
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

      // Gemini 3.1 (newest)
      'gemini-3.1-pro-preview',
      'gemini-3.1-flash-image-preview',
      'gemini-3.1-flash-lite-preview',

      // Gemini 3
      'gemini-3-pro-image-preview',
      'gemini-3-flash-preview',

      // Gemini 2.5
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-image',
      'gemini-2.5-flash-lite',
      'gemini-2.5-computer-use-preview-10-2025',

      // Gemma 4
      'gemma-4-31b-it',
      'gemma-4-26b-a4b-it',
    ],
  },
  {
    id: 'xai',
    name: 'xAI',
    models: [
      // Grok 4.20 (newest)
      'grok-4.20-0309-reasoning',
      'grok-4.20-0309-non-reasoning',
      'grok-4.20-multi-agent-0309',

      // Grok 4.1
      'grok-4-1-fast-reasoning',
      'grok-4-1-fast-non-reasoning',

      // Grok 4
      'grok-4',
      'grok-4-latest',
      'grok-4-fast-reasoning',
      'grok-4-fast-non-reasoning',

      // Grok Code
      'grok-code-fast-1',

      // Grok 3
      'grok-3',
      'grok-3-latest',

      // Grok 3 Mini
      'grok-3-mini',
      'grok-3-mini-latest',
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
      'openai/gpt-5.4',
      'openai/gpt-5.4-pro',
      'openai/gpt-5.3-codex',
      'openai/gpt-5.2',
      'openai/gpt-5.2-pro',
      'openai/gpt-5.2-codex',
      'openai/gpt-5.1',
      'openai/gpt-5.1-codex',
      'openai/gpt-5',
      'openai/gpt-5-pro',
      'openai/gpt-5-mini',
      'openai/gpt-4.1',
      'openai/gpt-4.1-mini',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/o4-mini',
      'openai/o3',
      'openai/o3-mini',
      'openai/o1',

      // Anthropic models via OpenRouter
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
      'google/gemini-3.1-pro-preview',
      'google/gemini-3-pro-preview',
      'google/gemini-3-flash-preview',
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-flash-lite',
      'google/gemini-2.0-flash',
      'google/gemini-2.0-flash-lite',

      // xAI models via OpenRouter
      'xai/grok-4-1-fast-reasoning',
      'xai/grok-4',
      'xai/grok-4-fast-reasoning',
      'xai/grok-code-fast-1',
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
] as const satisfies ChatProviderInfo[]
