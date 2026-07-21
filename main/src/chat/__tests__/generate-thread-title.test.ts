import '../runtime/__tests__/setup'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installChatTestRuntimeHooks } from '../runtime/test-runtime'

// ---------------------------------------------------------------------------
// Hoisted mock factories — must be defined before vi.mock() calls
// ---------------------------------------------------------------------------
const mockGenerateText = vi.hoisted(() => vi.fn())
const mockConvertToModelMessages = vi.hoisted(() => vi.fn())
const mockGetThread = vi.hoisted(() => vi.fn())
const mockWriteThread = vi.hoisted(() => vi.fn())
const mockReadSelectedModel = vi.hoisted(() => vi.fn())
const mockReadChatProvider = vi.hoisted(() => vi.fn())
const mockReadThreadSelectedModel = vi.hoisted(() =>
  vi.fn<() => { provider: string; model: string } | null>(() => null)
)
const mockCreateModelFromRequest = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('ai', () => ({
  generateText: mockGenerateText,
  convertToModelMessages: mockConvertToModelMessages,
}))

vi.mock('../../db/readers/threads-reader', () => ({
  readThread: mockGetThread,
  readAllThreads: vi.fn(() => []),
  readActiveThreadId: vi.fn(),
  readThreadCount: vi.fn(() => 0),
  readThreadSelectedModel: mockReadThreadSelectedModel,
  readThreadEnabledMcpTools: vi.fn(() => ({})),
  readThreadEnabledSkills: vi.fn(() => []),
}))

vi.mock('../../db/writers/threads-writer', () => ({
  writeThread: mockWriteThread,
  deleteThreadFromDb: vi.fn(),
  clearAllThreadsFromDb: vi.fn(),
  writeActiveThread: vi.fn(),
  writeThreadSelectedModel: vi.fn(),
  writeThreadEnabledMcpTools: vi.fn(),
  writeThreadEnabledSkills: vi.fn(),
}))

vi.mock('../../db/readers/agents-reader', () => ({
  readThreadAgentId: vi.fn(() => null),
  readAgent: vi.fn(),
  readAllAgents: vi.fn(() => []),
}))

vi.mock('../../db/readers/chat-settings-reader', () => ({
  readSelectedModel: mockReadSelectedModel,
  readChatProvider: mockReadChatProvider,
}))

vi.mock('../utils', () => ({
  createModelFromRequest: mockCreateModelFromRequest,
}))

vi.mock('../constants', async (importOriginal) => importOriginal())

vi.mock('../../logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Subject under test (imported after mocks)
// ---------------------------------------------------------------------------
import { generateThreadTitle } from '../generate-thread-title'

installChatTestRuntimeHooks()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeModel = { id: 'fake-model' }
const fakeConvertedMessages = [{ role: 'user', content: 'hello' }]

function makeThread(overrides: Record<string, unknown> = {}) {
  return {
    id: 'thread-1',
    title: undefined,
    titleEditedByUser: false,
    messages: [
      { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
      {
        id: 'm2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Hi there' }],
      },
    ],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateThreadTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetThread.mockReturnValue(makeThread())
    mockReadThreadSelectedModel.mockReturnValue(null)
    mockReadSelectedModel.mockReturnValue({
      provider: 'openai',
      model: 'gpt-4o',
    })
    mockReadChatProvider.mockReturnValue({ apiKey: 'sk-test' })
    mockCreateModelFromRequest.mockReturnValue(fakeModel)
    mockConvertToModelMessages.mockResolvedValue(fakeConvertedMessages)
    mockGenerateText.mockResolvedValue({ text: 'Great Title' })
  })

  describe('failure paths', () => {
    it('returns failure when thread is not found', async () => {
      mockGetThread.mockReturnValue(null)
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({
        success: false,
        error: 'Thread not found',
      })
      expect(mockWriteThread).not.toHaveBeenCalled()
    })

    it('returns failure when thread has no user message', async () => {
      mockGetThread.mockReturnValue(makeThread({ messages: [] }))
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({
        success: false,
        error: 'No user message in thread',
      })
    })

    it('returns failure when no model is selected', async () => {
      mockReadSelectedModel.mockReturnValue({ provider: '', model: '' })
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({
        success: false,
        error: 'No model selected',
      })
    })

    it('returns failure when provider is unknown', async () => {
      mockReadSelectedModel.mockReturnValue({
        provider: 'unknown-provider',
        model: 'x',
      })
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({ success: false })
      expect(result.error).toContain('Unknown provider')
    })

    it('returns failure when provider settings are not found', async () => {
      mockReadChatProvider.mockReturnValue(null)
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({
        success: false,
        error: 'Provider settings not found',
      })
    })

    it('falls back to the first user message when LLM returns only whitespace', async () => {
      mockGenerateText.mockResolvedValue({ text: '   ' })
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({
        success: true,
        title: 'Hello',
      })
      expect(mockWriteThread).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'thread-1',
          title: 'Hello',
          titleEditedByUser: false,
        })
      )
    })

    it('falls back to the first user message when generateText throws', async () => {
      mockGenerateText.mockRejectedValue(new Error('API timeout'))
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({
        success: true,
        title: 'Hello',
      })
    })

    it('falls back when generateText throws a non-Error value', async () => {
      mockGenerateText.mockRejectedValue('some string error')
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({
        success: true,
        title: 'Hello',
      })
    })

    it('returns failure when LLM and user-message fallback are both empty', async () => {
      mockGetThread.mockReturnValue(
        makeThread({
          messages: [
            { id: 'm1', role: 'user', parts: [{ type: 'text', text: '   ' }] },
          ],
        })
      )
      mockGenerateText.mockResolvedValue({ text: '' })
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({
        success: false,
        error: 'Empty title generated',
      })
      expect(mockWriteThread).not.toHaveBeenCalled()
    })
  })

  describe('success path', () => {
    it('returns success with the generated title', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Patching Security Vulnerabilities',
      })
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({
        success: true,
        title: 'Patching Security Vulnerabilities',
      })
    })

    it('calls writeThread with title and titleEditedByUser: false', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Auto Title' })
      await generateThreadTitle('thread-1')
      expect(mockWriteThread).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'thread-1',
          title: 'Auto Title',
          titleEditedByUser: false,
        })
      )
    })

    it('strips trailing punctuation from the title', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Deploy to Production.' })
      const result = await generateThreadTitle('thread-1')
      expect(result.title).toBe('Deploy to Production')
    })

    it('strips trailing question marks', async () => {
      mockGenerateText.mockResolvedValue({ text: 'How To Deploy?' })
      const result = await generateThreadTitle('thread-1')
      expect(result.title).toBe('How To Deploy')
    })

    it('calls convertToModelMessages with the context messages', async () => {
      await generateThreadTitle('thread-1')
      expect(mockConvertToModelMessages).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ role: 'user' })])
      )
    })

    it('calls generateText with the correct system prompt and maxOutputTokens', async () => {
      await generateThreadTitle('thread-1')
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: fakeModel,
          messages: fakeConvertedMessages,
          maxOutputTokens: 64,
          instructions: expect.stringContaining('6 words or fewer'),
        })
      )
    })

    it('disables OpenRouter reasoning for title generation', async () => {
      mockReadSelectedModel.mockReturnValue({
        provider: 'openrouter',
        model: 'moonshotai/kimi-k3',
      })
      mockReadChatProvider.mockReturnValue({
        apiKey: 'sk-or-v1-test-key',
      })

      await generateThreadTitle('thread-1')

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: {
            openrouter: {
              reasoning: { enabled: false, effort: 'none' },
            },
          },
        })
      )
    })

    it('does not pass OpenRouter reasoning options for other providers', async () => {
      await generateThreadTitle('thread-1')
      const call = mockGenerateText.mock.calls[0]?.[0] as
        { providerOptions?: unknown } | undefined
      expect(call?.providerOptions).toBeUndefined()
    })

    it('omits hollow assistant messages from the title context', async () => {
      mockGetThread.mockReturnValue(
        makeThread({
          messages: [
            {
              id: 'm1',
              role: 'user',
              parts: [{ type: 'text', text: 'Hello' }],
            },
            { id: 'm2', role: 'assistant', parts: [] },
          ],
        })
      )
      await generateThreadTitle('thread-1')
      expect(mockConvertToModelMessages).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'm1', role: 'user' }),
      ])
    })

    it('works when thread has only a user message (no assistant reply yet)', async () => {
      mockGetThread.mockReturnValue(
        makeThread({
          messages: [
            {
              id: 'm1',
              role: 'user',
              parts: [{ type: 'text', text: 'Hello' }],
            },
          ],
        })
      )
      mockGenerateText.mockResolvedValue({ text: 'Solo User Message' })
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({
        success: true,
        title: 'Solo User Message',
      })
    })

    it('prefers the thread selected model over the global default', async () => {
      mockReadThreadSelectedModel.mockReturnValue({
        provider: 'openrouter',
        model: 'moonshotai/kimi-k3',
      })
      mockReadSelectedModel.mockReturnValue({
        provider: 'openai',
        model: 'gpt-4o',
      })
      mockReadChatProvider.mockReturnValue({
        apiKey: 'sk-or-v1-test-key',
      })

      await generateThreadTitle('thread-1')

      expect(mockCreateModelFromRequest).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'openrouter' }),
        expect.objectContaining({
          provider: 'openrouter',
          model: 'moonshotai/kimi-k3',
        })
      )
    })

    it('skips LLM when the thread already has a non-fallback title', async () => {
      mockGetThread.mockReturnValue(
        makeThread({ title: 'Existing Custom Title' })
      )

      const result = await generateThreadTitle('thread-1')

      expect(result).toMatchObject({
        success: true,
        title: 'Existing Custom Title',
      })
      expect(mockGenerateText).not.toHaveBeenCalled()
      expect(mockWriteThread).not.toHaveBeenCalled()
    })

    it('skips LLM after the first assistant exchange', async () => {
      mockGetThread.mockReturnValue(
        makeThread({
          title: undefined,
          messages: [
            {
              id: 'm1',
              role: 'user',
              parts: [{ type: 'text', text: 'Hello' }],
            },
            {
              id: 'm2',
              role: 'assistant',
              parts: [{ type: 'text', text: 'Hi' }],
            },
            {
              id: 'm3',
              role: 'user',
              parts: [{ type: 'text', text: 'Follow up' }],
            },
            {
              id: 'm4',
              role: 'assistant',
              parts: [{ type: 'text', text: 'Sure' }],
            },
          ],
        })
      )

      const result = await generateThreadTitle('thread-1')

      expect(result).toMatchObject({ success: true, title: 'Hello' })
      expect(mockGenerateText).not.toHaveBeenCalled()
    })

    it('returns the existing title when titleEditedByUser is true', async () => {
      mockGetThread.mockReturnValue(
        makeThread({
          title: 'Manual Title',
          titleEditedByUser: true,
        })
      )

      const result = await generateThreadTitle('thread-1')

      expect(result).toMatchObject({
        success: true,
        title: 'Manual Title',
      })
      expect(mockGenerateText).not.toHaveBeenCalled()
    })

    it('persists the user-message fallback before calling the LLM', async () => {
      await generateThreadTitle('thread-1')

      expect(mockWriteThread).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'thread-1',
          title: 'Hello',
          titleEditedByUser: false,
        })
      )
    })
  })

  describe('remote provider (apiKey path)', () => {
    it('passes apiKey in the request for a non-local provider', async () => {
      mockReadSelectedModel.mockReturnValue({
        provider: 'openai',
        model: 'gpt-4o',
      })
      mockReadChatProvider.mockReturnValue({ apiKey: 'sk-remote-key' })

      await generateThreadTitle('thread-1')

      expect(mockCreateModelFromRequest).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'openai' }),
        expect.objectContaining({ apiKey: 'sk-remote-key' })
      )
      expect(mockCreateModelFromRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.not.objectContaining({ endpointURL: expect.anything() })
      )
    })
  })

  describe('local provider (endpointURL path)', () => {
    it('passes endpointURL in the request for a local provider', async () => {
      mockReadSelectedModel.mockReturnValue({
        provider: 'ollama',
        model: 'llama3',
      })
      mockReadChatProvider.mockReturnValue({
        endpointURL: 'http://localhost:11434',
      })

      await generateThreadTitle('thread-1')

      expect(mockCreateModelFromRequest).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ollama' }),
        expect.objectContaining({ endpointURL: 'http://localhost:11434' })
      )
      expect(mockCreateModelFromRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.not.objectContaining({ apiKey: expect.anything() })
      )
    })

    it('uses empty string for endpointURL when not configured', async () => {
      mockReadSelectedModel.mockReturnValue({
        provider: 'ollama',
        model: 'llama3',
      })
      mockReadChatProvider.mockReturnValue({}) // no endpointURL

      await generateThreadTitle('thread-1')

      expect(mockCreateModelFromRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ endpointURL: '' })
      )
    })
  })
})
