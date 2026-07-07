import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  vi.fn().mockResolvedValue(undefined)
)
const mockUpdateThreadMessages = vi.hoisted(() =>
  vi.fn(() => ({ success: true }))
)
const mockGetAgent = vi.hoisted(() => vi.fn())
const mockResolveAgentForThread = vi.hoisted(() => vi.fn())

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

vi.mock('@sentry/electron/main', () => ({
  startSpanManual: vi.fn(
    async (
      _opts: unknown,
      fn: (span: unknown, finish: () => void) => unknown
    ) =>
      fn(
        {
          spanContext: () => ({}),
          setStatus: vi.fn(),
          setAttribute: vi.fn(),
          setAttributes: vi.fn(),
        },
        vi.fn()
      )
  ),
  startSpan: vi.fn(
    (_opts: unknown, fn: (span: { addLink: () => void }) => unknown) =>
      fn({ addLink: vi.fn() })
  ),
}))

vi.mock('../../logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../providers', () => ({
  CHAT_PROVIDERS: [{ id: 'openai', name: 'OpenAI' }],
}))

vi.mock('../mcp-tools', () => ({
  createMcpTools: mockCreateMcpTools,
  getCachedUiMetadata: mockGetCachedUiMetadata,
}))

vi.mock('../active-streams', () => ({
  runManagedStream: mockRunManagedStream,
  setToolUiMetadata: vi.fn(),
}))

vi.mock('../threads-storage', () => ({
  updateThreadMessages: mockUpdateThreadMessages,
}))

vi.mock('../utils', () => ({
  createModelFromRequest: mockCreateModelFromRequest,
}))

vi.mock('../agents/registry', () => ({
  getAgent: mockGetAgent,
  resolveAgentForThread: mockResolveAgentForThread,
}))

vi.mock('../agents/builtin-agent-tools', () => ({
  createBuiltinAgentTools: mockCreateBuiltinAgentTools,
}))

import { handleChatStreamRealtime } from '../streaming'
import type { ChatRequest } from '../types'

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
  it('uses standalone toUIMessageStream with result.stream and onEnd callback', async () => {
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
        onEnd: expect.any(Function),
      })
    )
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
})
