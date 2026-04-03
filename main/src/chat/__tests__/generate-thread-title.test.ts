import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mock factories — must be defined before vi.mock() calls
// ---------------------------------------------------------------------------
const mockGenerateText = vi.hoisted(() => vi.fn())
const mockConvertToModelMessages = vi.hoisted(() => vi.fn())
const mockGetThread = vi.hoisted(() => vi.fn())
const mockUpdateThread = vi.hoisted(() => vi.fn())
const mockReadSelectedModel = vi.hoisted(() => vi.fn())
const mockReadChatProvider = vi.hoisted(() => vi.fn())
const mockCreateModelFromRequest = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('ai', () => ({
  generateText: mockGenerateText,
  convertToModelMessages: mockConvertToModelMessages,
}))

vi.mock('../threads-storage', () => ({
  getThread: mockGetThread,
  updateThread: mockUpdateThread,
}))

vi.mock('../../db/readers/chat-settings-reader', () => ({
  readSelectedModel: mockReadSelectedModel,
  readChatProvider: mockReadChatProvider,
}))

vi.mock('../utils', () => ({
  createModelFromRequest: mockCreateModelFromRequest,
}))

vi.mock('../providers', () => ({
  CHAT_PROVIDERS: [
    { id: 'openai', name: 'OpenAI' },
    { id: 'ollama', name: 'Ollama' },
  ],
}))

vi.mock('../constants', () => ({
  LOCAL_PROVIDER_IDS: ['ollama', 'lmstudio'],
}))

vi.mock('../../logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Subject under test (imported after mocks)
// ---------------------------------------------------------------------------
import { generateThreadTitle } from '../generate-thread-title'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeModel = { id: 'fake-model' }
const fakeConvertedMessages = [{ role: 'user', content: 'hello' }]

function makeThread(overrides: Record<string, unknown> = {}) {
  return {
    id: 'thread-1',
    title: 'Old title',
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
      expect(mockUpdateThread).not.toHaveBeenCalled()
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

    it('returns failure when LLM returns only whitespace', async () => {
      mockGenerateText.mockResolvedValue({ text: '   ' })
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({
        success: false,
        error: 'Empty title generated',
      })
      expect(mockUpdateThread).not.toHaveBeenCalled()
    })

    it('returns failure with error message when generateText throws', async () => {
      mockGenerateText.mockRejectedValue(new Error('API timeout'))
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({ success: false, error: 'API timeout' })
    })

    it('returns failure with "Unknown error" for non-Error throws', async () => {
      mockGenerateText.mockRejectedValue('some string error')
      const result = await generateThreadTitle('thread-1')
      expect(result).toMatchObject({ success: false, error: 'Unknown error' })
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

    it('calls updateThread with title and titleEditedByUser: false', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Auto Title' })
      await generateThreadTitle('thread-1')
      expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', {
        title: 'Auto Title',
        titleEditedByUser: false,
      })
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
          maxOutputTokens: 20,
          system: expect.stringContaining('6 words or fewer'),
        })
      )
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
