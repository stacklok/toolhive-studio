import '../runtime/__tests__/setup'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Effect } from 'effect'

const mockAgentStream = vi.hoisted(() => vi.fn())
const mockToolLoopAgentCtor = vi.hoisted(() => vi.fn())
const mockConvertToModelMessages = vi.hoisted(() =>
  vi.fn().mockResolvedValue([])
)
const mockStepCountIs = vi.hoisted(() => vi.fn(() => 'step-count-marker'))
const mockToUIMessageStream = vi.hoisted(() => vi.fn().mockReturnValue({}))
const mockCreateIdGenerator = vi.hoisted(() => vi.fn(() => () => 'msg_1'))

const mockCreateModelFromRequest = vi.hoisted(() =>
  vi.fn(() => ({ id: 'model' }))
)
const mockCreateMcpTools = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ tools: {}, clients: [], enabledTools: {} })
)
const mockGetCachedUiMetadata = vi.hoisted(() => vi.fn(() => ({})))
const mockCreateBuiltinAgentTools = vi.hoisted(() =>
  vi.fn<
    () => {
      tools: Record<string, unknown>
      cleanup: () => void
      instructionsSuffix?: string
    }
  >(() => ({ tools: {}, cleanup: vi.fn() }))
)
const mockRunManagedStream = vi.hoisted(() =>
  vi.fn().mockImplementation(async (args: unknown) => {
    const options = args as {
      onComplete?: (info: {
        status: 'finished' | 'error'
      }) => void | Promise<void>
    }
    await options.onComplete?.({ status: 'finished' })
  })
)
const mockGetAgent = vi.hoisted(() => vi.fn())
const mockResolveAgentForThread = vi.hoisted(() => vi.fn())
const mockGenerateThreadTitle = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    success: true,
    title: 'Generated Title',
    updated: true,
  })
)
const mockBroadcastThreadUpdated = vi.hoisted(() => vi.fn())

vi.mock('ai', () => ({
  ToolLoopAgent: class {
    constructor(...args: unknown[]) {
      mockToolLoopAgentCtor(...args)
    }
    stream = (...args: unknown[]) => mockAgentStream(...args)
  },
  isStepCount: mockStepCountIs,
  convertToModelMessages: mockConvertToModelMessages,
  createIdGenerator: mockCreateIdGenerator,
  toUIMessageStream: mockToUIMessageStream,
}))

vi.mock('../../logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../utils', () => ({
  createModelFromRequest: mockCreateModelFromRequest,
}))

vi.mock('../agents/builtin-agent-tools', () => ({
  createBuiltinAgentTools: mockCreateBuiltinAgentTools,
}))

vi.mock('../generate-thread-title', () => ({
  generateThreadTitle: mockGenerateThreadTitle,
}))

vi.mock('../streaming/stream-registry-broadcast', () => ({
  broadcastThreadUpdated: mockBroadcastThreadUpdated,
  broadcastState: vi.fn(),
  broadcast: vi.fn(),
  safeSend: vi.fn(),
}))

import { handleChatStreamRealtime as handleChatStreamRealtimeImpl } from '../streaming/chat-stream-service-impl'
import type { ChatRequest } from '../types'

function makeStreamDeps() {
  return {
    agents: {
      getAgent: (id: string) => Effect.sync(() => mockGetAgent(id)),
      resolveAgentForThread: (threadId: string) =>
        Effect.sync(() => mockResolveAgentForThread(threadId)),
    },
    mcp: {
      createMcpTools: (
        threadId?: string,
        options?: { sanitizeSchemas?: boolean }
      ) =>
        Effect.tryPromise({
          try: () => mockCreateMcpTools(threadId, options),
          catch: (cause) => cause as Error,
        }),
      getCachedUiMetadata: () => Effect.sync(() => mockGetCachedUiMetadata()),
    },
    registry: {
      runManagedStream: (args: unknown) =>
        Effect.tryPromise({
          try: () => mockRunManagedStream(args),
          catch: (cause) => cause as Error,
        }),
    },
  }
}

async function handleChatStreamRealtime(
  request: ChatRequest,
  streamId: string,
  sender: Electron.WebContents
) {
  return handleChatStreamRealtimeImpl(
    makeStreamDeps() as Parameters<typeof handleChatStreamRealtimeImpl>[0],
    request,
    streamId,
    sender
  )
}

const fakeSender = { send: vi.fn() } as unknown as Electron.WebContents

function makeRequest(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    chatId: 'thread-1',
    messages: [],
    model: 'gpt-4o',
    provider: 'openai',
    apiKey: 'sk-test',
    ...overrides,
  } as ChatRequest
}

function fakeAgent(
  id: string,
  instructions: string,
  builtinToolsKey: 'skills' | null = null
) {
  return {
    id,
    kind: 'builtin' as const,
    name: id,
    description: '',
    instructions,
    builtinToolsKey,
    createdAt: 0,
    updatedAt: 0,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAgentStream.mockResolvedValue({
    stream: {},
  })
  mockCreateMcpTools.mockResolvedValue({
    tools: {},
    clients: [],
    enabledTools: {},
  })
  mockCreateBuiltinAgentTools.mockReturnValue({
    tools: {},
    cleanup: vi.fn(),
  })
})

describe('handleChatStreamRealtime — agent resolution', () => {
  it('builds a ToolLoopAgent using instructions from the agent matching request.agentId', async () => {
    mockGetAgent.mockReturnValue(
      fakeAgent('custom.my-agent', 'CUSTOM AGENT INSTRUCTIONS')
    )

    await handleChatStreamRealtime(
      makeRequest({ agentId: 'custom.my-agent' }),
      'stream-1',
      fakeSender
    )

    expect(mockGetAgent).toHaveBeenCalledWith('custom.my-agent')
    expect(mockResolveAgentForThread).not.toHaveBeenCalled()
    expect(mockToolLoopAgentCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: 'CUSTOM AGENT INSTRUCTIONS',
      })
    )
  })

  it('falls back to resolveAgentForThread when no agentId is provided', async () => {
    mockResolveAgentForThread.mockReturnValue(
      fakeAgent('builtin.toolhive-assistant', 'DEFAULT INSTRUCTIONS')
    )

    await handleChatStreamRealtime(
      makeRequest({ agentId: undefined }),
      'stream-2',
      fakeSender
    )

    expect(mockResolveAgentForThread).toHaveBeenCalledWith('thread-1')
    expect(mockGetAgent).not.toHaveBeenCalled()
    expect(mockToolLoopAgentCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: 'DEFAULT INSTRUCTIONS',
      })
    )
  })

  it('falls back to resolveAgentForThread when the requested agentId does not exist', async () => {
    mockGetAgent.mockReturnValue(null)
    mockResolveAgentForThread.mockReturnValue(
      fakeAgent('builtin.toolhive-assistant', 'FALLBACK INSTRUCTIONS')
    )

    await handleChatStreamRealtime(
      makeRequest({ agentId: 'custom.deleted' }),
      'stream-3',
      fakeSender
    )

    expect(mockGetAgent).toHaveBeenCalledWith('custom.deleted')
    expect(mockResolveAgentForThread).toHaveBeenCalledWith('thread-1')
    expect(mockToolLoopAgentCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: 'FALLBACK INSTRUCTIONS',
      })
    )
  })

  it('attaches built-in tools for the agent based on builtinToolsKey', async () => {
    mockGetAgent.mockReturnValue(
      fakeAgent('builtin.skills', 'SKILLS INSTRUCTIONS', 'skills')
    )
    const cleanup = vi.fn()
    const skillsTools = { build_skill: { description: 'x' } }
    mockCreateBuiltinAgentTools.mockReturnValue({
      tools: skillsTools,
      cleanup,
    })

    await handleChatStreamRealtime(
      makeRequest({ agentId: 'builtin.skills' }),
      'stream-4',
      fakeSender
    )

    expect(mockCreateBuiltinAgentTools).toHaveBeenCalledWith('skills', {
      threadId: 'thread-1',
    })
    expect(mockToolLoopAgentCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.objectContaining({ build_skill: expect.anything() }),
        toolChoice: 'auto',
      })
    )
  })

  it('appends instructionsSuffix from the built-in tools handle to the agent instructions', async () => {
    mockGetAgent.mockReturnValue(
      fakeAgent('builtin.skills', 'BASE INSTRUCTIONS', 'skills')
    )
    mockCreateBuiltinAgentTools.mockReturnValue({
      tools: { list_skills: { description: 'x' } },
      cleanup: vi.fn(),
      instructionsSuffix: '## Available installed skills\n\n- foo: bar',
    })

    await handleChatStreamRealtime(
      makeRequest({ agentId: 'builtin.skills' }),
      'stream-suffix',
      fakeSender
    )

    expect(mockCreateBuiltinAgentTools).toHaveBeenCalledWith('skills', {
      threadId: 'thread-1',
    })
    expect(mockToolLoopAgentCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions:
          'BASE INSTRUCTIONS\n\n## Available installed skills\n\n- foo: bar',
      })
    )
  })

  it('omits tools/toolChoice when neither MCP nor built-in tools are present', async () => {
    mockGetAgent.mockReturnValue(
      fakeAgent('builtin.toolhive-assistant', 'TOOLHIVE INSTRUCTIONS')
    )

    await handleChatStreamRealtime(
      makeRequest({ agentId: 'builtin.toolhive-assistant' }),
      'stream-5',
      fakeSender
    )

    const ctorArg = mockToolLoopAgentCtor.mock.calls[0]![0] as {
      tools?: unknown
      toolChoice?: unknown
    }
    expect(ctorArg.tools).toBeUndefined()
    expect(ctorArg.toolChoice).toBeUndefined()
  })
})

describe('handleChatStreamRealtime — error message mapping', () => {
  it('passes onError to toUIMessageStream so provider errors reach the UI', async () => {
    mockGetAgent.mockReturnValue(
      fakeAgent('builtin.toolhive-assistant', 'TOOLHIVE INSTRUCTIONS')
    )

    await handleChatStreamRealtime(
      makeRequest({ agentId: 'builtin.toolhive-assistant' }),
      'stream-err',
      fakeSender
    )

    expect(mockToUIMessageStream).toHaveBeenCalled()
    const opts = mockToUIMessageStream.mock.calls[0]![0] as {
      onError: (error: unknown) => string
    }
    expect(opts.onError(new Error('high demand, try later'))).toBe(
      'high demand, try later'
    )
    expect(opts.onError(new Error('Overloaded'))).toContain('overloaded')
    expect(
      opts.onError({
        message: 'This model is currently experiencing high demand.',
      })
    ).toBe('This model is currently experiencing high demand.')
    expect(opts.onError({ code: 'UNKNOWN' })).toBe('An error occurred.')
  })
})

describe('handleChatStreamRealtime — AI SDK v7 UI stream wiring', () => {
  it('uses standalone toUIMessageStream without an onEnd persistence callback', async () => {
    mockGetAgent.mockReturnValue(
      fakeAgent('builtin.toolhive-assistant', 'TOOLHIVE INSTRUCTIONS')
    )

    await handleChatStreamRealtime(
      makeRequest({ agentId: 'builtin.toolhive-assistant' }),
      'stream-v7',
      fakeSender
    )

    expect(mockToUIMessageStream).toHaveBeenCalledWith(
      expect.objectContaining({
        stream: {},
      })
    )
    expect(mockToUIMessageStream.mock.calls[0]![0]).not.toHaveProperty('onEnd')
    expect(mockToUIMessageStream.mock.calls[0]![0]).not.toHaveProperty(
      'onFinish'
    )
  })

  it('accumulates per-step usage into totalUsage metadata and finish payload', async () => {
    mockGetAgent.mockReturnValue(
      fakeAgent('builtin.toolhive-assistant', 'TOOLHIVE INSTRUCTIONS')
    )

    await handleChatStreamRealtime(
      makeRequest({ agentId: 'builtin.toolhive-assistant' }),
      'stream-usage',
      fakeSender
    )

    const opts = mockToUIMessageStream.mock.calls[0]![0] as {
      messageMetadata: (args: {
        part: unknown
      }) => Record<string, unknown> | undefined
    }

    const stepOne = opts.messageMetadata({
      part: {
        type: 'finish-step',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          inputTokenDetails: { cacheReadTokens: 20 },
          outputTokenDetails: { reasoningTokens: 5 },
        },
      },
    })
    expect(stepOne?.totalUsage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      inputTokenDetails: { cacheReadTokens: 20 },
      outputTokenDetails: { reasoningTokens: 5 },
    })

    const stepTwo = opts.messageMetadata({
      part: {
        type: 'finish-step',
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          inputTokenDetails: { cacheReadTokens: 4 },
          outputTokenDetails: { reasoningTokens: 1 },
        },
      },
    })
    expect(stepTwo?.totalUsage).toEqual({
      inputTokens: 110,
      outputTokens: 55,
      totalTokens: 165,
      inputTokenDetails: { cacheReadTokens: 24 },
      outputTokenDetails: { reasoningTokens: 6 },
    })

    const finish = opts.messageMetadata({
      part: {
        type: 'finish',
        finishReason: 'stop',
        totalUsage: {
          inputTokens: 110,
          outputTokens: 55,
          totalTokens: 165,
          inputTokenDetails: { cacheReadTokens: 24 },
          outputTokenDetails: { reasoningTokens: 6 },
        },
      },
    })
    expect(finish).toEqual(
      expect.objectContaining({
        totalUsage: stepTwo?.totalUsage,
        finishReason: 'stop',
        responseTime: expect.any(Number),
      })
    )
  })

  it('sets allowSystemInMessages on ToolLoopAgent for legacy persisted threads', async () => {
    mockGetAgent.mockReturnValue(
      fakeAgent('builtin.toolhive-assistant', 'TOOLHIVE INSTRUCTIONS')
    )

    await handleChatStreamRealtime(
      makeRequest({ agentId: 'builtin.toolhive-assistant' }),
      'stream-system',
      fakeSender
    )

    expect(mockToolLoopAgentCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        allowSystemInMessages: true,
      })
    )
  })

  it('passes sanitizeSchemas to createMcpTools only for Gemini-compatible providers', async () => {
    mockGetAgent.mockReturnValue(
      fakeAgent('builtin.toolhive-assistant', 'TOOLHIVE INSTRUCTIONS')
    )

    await handleChatStreamRealtime(
      makeRequest({ provider: 'openai', model: 'gpt-4o' }),
      'stream-openai',
      fakeSender
    )
    expect(mockCreateMcpTools).toHaveBeenCalledWith('thread-1', {
      sanitizeSchemas: false,
    })

    mockCreateMcpTools.mockClear()

    await handleChatStreamRealtime(
      makeRequest({ provider: 'google', model: 'gemini-2.5-flash' }),
      'stream-google',
      fakeSender
    )
    expect(mockCreateMcpTools).toHaveBeenCalledWith('thread-1', {
      sanitizeSchemas: true,
    })

    mockCreateMcpTools.mockClear()

    await handleChatStreamRealtime(
      makeRequest({ provider: 'openrouter', model: 'google/gemini-2.5-flash' }),
      'stream-openrouter-google',
      fakeSender
    )
    expect(mockCreateMcpTools).toHaveBeenCalledWith('thread-1', {
      sanitizeSchemas: true,
    })
  })
})

describe('handleChatStreamRealtime — auto-title on stream complete', () => {
  it('calls generateThreadTitle and broadcasts thread updated on success', async () => {
    mockResolveAgentForThread.mockReturnValue(
      fakeAgent('builtin.toolhive-assistant', 'DEFAULT INSTRUCTIONS')
    )

    await handleChatStreamRealtime(makeRequest(), 'stream-title', fakeSender)

    expect(mockGenerateThreadTitle).toHaveBeenCalledWith('thread-1')
    expect(mockBroadcastThreadUpdated).toHaveBeenCalledWith('thread-1')
  })

  it('skips thread-updated broadcast when title generation is a no-op', async () => {
    mockGenerateThreadTitle.mockResolvedValueOnce({
      success: true,
      title: 'Existing Title',
      updated: false,
    })
    mockResolveAgentForThread.mockReturnValue(
      fakeAgent('builtin.toolhive-assistant', 'DEFAULT INSTRUCTIONS')
    )

    await handleChatStreamRealtime(makeRequest(), 'stream-noop', fakeSender)

    expect(mockGenerateThreadTitle).toHaveBeenCalledWith('thread-1')
    expect(mockBroadcastThreadUpdated).not.toHaveBeenCalled()
  })

  it('skips title generation when the stream ends in error', async () => {
    mockRunManagedStream.mockImplementationOnce(async (args: unknown) => {
      const options = args as {
        onComplete?: (info: {
          status: 'finished' | 'error'
        }) => void | Promise<void>
      }
      await options.onComplete?.({ status: 'error' })
    })
    mockResolveAgentForThread.mockReturnValue(
      fakeAgent('builtin.toolhive-assistant', 'DEFAULT INSTRUCTIONS')
    )

    await handleChatStreamRealtime(makeRequest(), 'stream-error', fakeSender)

    expect(mockGenerateThreadTitle).not.toHaveBeenCalled()
    expect(mockBroadcastThreadUpdated).not.toHaveBeenCalled()
  })
})

describe('handleChatStreamRealtime — message sanitization', () => {
  it('passes sanitized messages to convertToModelMessages', async () => {
    mockResolveAgentForThread.mockReturnValue(
      fakeAgent('builtin.toolhive-assistant', 'DEFAULT INSTRUCTIONS')
    )

    await handleChatStreamRealtime(
      makeRequest({
        messages: [
          {
            id: 'u1',
            role: 'user',
            parts: [{ type: 'text', text: 'hi' }],
          },
          {
            id: 'a-hollow',
            role: 'assistant',
            parts: [],
          },
          {
            id: 'u2',
            role: 'user',
            parts: [{ type: 'text', text: 'again' }],
          },
        ],
      }),
      'stream-sanitize',
      fakeSender
    )

    expect(mockConvertToModelMessages).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'u1',
        role: 'user',
        parts: [
          { type: 'text', text: 'hi' },
          { type: 'text', text: 'again' },
        ],
      }),
    ])
  })
})
