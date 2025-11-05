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
