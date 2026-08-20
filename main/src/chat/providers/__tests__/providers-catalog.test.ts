import { describe, expect, it, vi } from 'vitest'

const { responsesMock, chatMock, anthropicMock, googleMock } = vi.hoisted(
  () => ({
    responsesMock: vi.fn((modelId: string) => ({ modelId, mode: 'responses' })),
    chatMock: vi.fn((modelId: string) => ({ modelId, mode: 'chat' })),
    anthropicMock: vi.fn((modelId: string) => ({ modelId, mode: 'anthropic' })),
    googleMock: vi.fn((modelId: string) => ({ modelId, mode: 'google' })),
  })
)

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
  },
}))

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({
    responses: responsesMock,
    chat: chatMock,
  })),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => anthropicMock),
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogle: vi.fn(() => googleMock),
}))

vi.mock('../thv-llm', () => ({
  THV_LLM_PROVIDER_ID: 'thv-llm',
  THV_LLM_PROXY_API_KEY: 'thv-proxy',
  assertLoopbackBaseURL: vi.fn(),
  gatewayFetch: vi.fn(),
  gatewayFetchFromInput: vi.fn(),
  isClaudeGatewayModel: (modelId: string) => {
    const id = modelId.trim().toLowerCase()
    return id.includes('claude') || id.startsWith('anthropic.')
  },
  isGeminiGatewayModel: (modelId: string) => {
    const id = modelId.trim().toLowerCase()
    return id.includes('gemini') || id.startsWith('google.')
  },
  anthropicBaseURLFromGatewayEndpoint: (endpointURL: string) => {
    const parsed = new URL(endpointURL)
    return `${parsed.protocol}//${parsed.host}/anthropic/v1`
  },
  googleBaseURLFromGatewayEndpoint: (endpointURL: string) => {
    const parsed = new URL(endpointURL)
    return `${parsed.protocol}//${parsed.host}/v1beta`
  },
}))

describe('ToolHive LLM gateway provider catalog', () => {
  it('uses OpenAI Chat Completions for GPT models', async () => {
    const { CHAT_PROVIDERS } = await import('../providers-catalog')
    const gateway = CHAT_PROVIDERS.find((provider) => provider.id === 'thv-llm')
    expect(gateway).toBeDefined()

    chatMock.mockClear()
    anthropicMock.mockClear()
    googleMock.mockClear()

    const model = gateway!.createModel('gpt-4.1', 'http://127.0.0.1:14000/v1')

    expect(chatMock).toHaveBeenCalledWith('gpt-4.1')
    expect(anthropicMock).not.toHaveBeenCalled()
    expect(googleMock).not.toHaveBeenCalled()
    expect(model).toEqual({ modelId: 'gpt-4.1', mode: 'chat' })
  })

  it('uses Anthropic Messages for Claude models', async () => {
    const { CHAT_PROVIDERS } = await import('../providers-catalog')
    const gateway = CHAT_PROVIDERS.find((provider) => provider.id === 'thv-llm')
    expect(gateway).toBeDefined()

    chatMock.mockClear()
    anthropicMock.mockClear()
    googleMock.mockClear()

    const model = gateway!.createModel(
      'claude-sonnet-5',
      'http://127.0.0.1:14000/v1'
    )

    expect(anthropicMock).toHaveBeenCalledWith('claude-sonnet-5')
    expect(chatMock).not.toHaveBeenCalled()
    expect(googleMock).not.toHaveBeenCalled()
    expect(model).toEqual({ modelId: 'claude-sonnet-5', mode: 'anthropic' })
  })

  it('uses Google generateContent for Gemini models', async () => {
    const { CHAT_PROVIDERS } = await import('../providers-catalog')
    const gateway = CHAT_PROVIDERS.find((provider) => provider.id === 'thv-llm')
    expect(gateway).toBeDefined()

    chatMock.mockClear()
    anthropicMock.mockClear()
    googleMock.mockClear()

    const model = gateway!.createModel(
      'gemini-2.5-flash',
      'http://127.0.0.1:14000/v1'
    )

    expect(googleMock).toHaveBeenCalledWith('gemini-2.5-flash')
    expect(chatMock).not.toHaveBeenCalled()
    expect(anthropicMock).not.toHaveBeenCalled()
    expect(model).toEqual({ modelId: 'gemini-2.5-flash', mode: 'google' })
  })
})
