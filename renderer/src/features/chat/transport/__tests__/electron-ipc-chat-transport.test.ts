import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { ElectronIPCChatTransport } from '../electron-ipc-chat-transport'
import type { ChatUIMessage } from '../../types'

describe('Electron IPC Chat Transport', () => {
  let queryClient: QueryClient
  let transport: ElectronIPCChatTransport
  let mockMessages: ChatUIMessage[]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    transport = new ElectronIPCChatTransport({ queryClient })

    mockMessages = [
      {
        id: 'msg-1',
        role: 'user',
        parts: [{ type: 'text', text: 'Hello, world!' }],
      },
    ]

    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('getSettingsFromQuery', () => {
    it('returns empty settings when no selected model exists', async () => {
      // No data in query cache
      queryClient.setQueryData(['chat', 'selectedModel'], undefined)

      const result = await (
        transport as unknown as {
          getSettingsFromQuery: () => Promise<{
            provider: string
            model: string
            apiKey: string
            enabledTools: string[]
          }>
        }
      ).getSettingsFromQuery()

      expect(result).toEqual({
        provider: '',
        model: '',
        apiKey: '',
        enabledTools: [],
      })
    })

    it('returns empty settings when selected model has no provider', async () => {
      queryClient.setQueryData(['chat', 'selectedModel'], {
        provider: '',
        model: '',
      })

      const result = await (
        transport as unknown as {
          getSettingsFromQuery: () => Promise<{
            provider: string
            model: string
            apiKey: string
            enabledTools: string[]
          }>
        }
      ).getSettingsFromQuery()

      expect(result).toEqual({
        provider: '',
        model: '',
        apiKey: '',
        enabledTools: [],
      })
    })

    it('returns correct settings when provider and model exist', async () => {
      const selectedModel = { provider: 'openai', model: 'gpt-4' }
      const providerSettings = {
        apiKey: 'sk-test-key',
        enabledTools: ['tool1', 'tool2'],
      }

      queryClient.setQueryData(['chat', 'selectedModel'], selectedModel)
      queryClient.setQueryData(['chat', 'settings', 'openai'], providerSettings)

      const result = await (
        transport as unknown as {
          getSettingsFromQuery: () => Promise<{
            provider: string
            model: string
            apiKey: string
            enabledTools: string[]
          }>
        }
      ).getSettingsFromQuery()

      expect(result).toEqual({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
        enabledTools: ['tool1', 'tool2'],
      })
    })

    it('returns settings with empty values when provider settings are missing', async () => {
      const selectedModel = { provider: 'anthropic', model: 'claude-3' }

      queryClient.setQueryData(['chat', 'selectedModel'], selectedModel)
      // No provider settings in cache

      const result = await (
        transport as unknown as {
          getSettingsFromQuery: () => Promise<{
            provider: string
            model: string
            apiKey: string
            enabledTools: string[]
          }>
        }
      ).getSettingsFromQuery()

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-3',
        apiKey: '',
        enabledTools: [],
      })
    })
  })

  describe('sendMessages', () => {
    const defaultOptions = {
      trigger: 'submit-message' as const,
      chatId: 'test-chat',
      messageId: 'msg-1',
      messages: [
        {
          id: 'msg-1',
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: 'Hello, world!' }],
        },
      ],
      abortSignal: undefined,
    }

    beforeEach(() => {
      // Set up valid settings in query cache
      queryClient.setQueryData(['chat', 'selectedModel'], {
        provider: 'openai',
        model: 'gpt-4',
      })
      queryClient.setQueryData(['chat', 'settings', 'openai'], {
        apiKey: 'sk-test-key',
        enabledTools: [],
      })
    })

    it('throws error when provider is missing', async () => {
      queryClient.setQueryData(['chat', 'selectedModel'], {
        provider: '',
        model: 'gpt-4',
      })

      await expect(transport.sendMessages(defaultOptions)).rejects.toThrow(
        'Please select an AI model in the settings'
      )
    })

    it('throws error when model is missing', async () => {
      queryClient.setQueryData(['chat', 'selectedModel'], {
        provider: 'openai',
        model: '',
      })

      await expect(transport.sendMessages(defaultOptions)).rejects.toThrow(
        'Please select an AI model in the settings'
      )
    })

    it('throws error when API key is missing', async () => {
      queryClient.setQueryData(['chat', 'settings', 'openai'], {
        apiKey: '',
        enabledTools: [],
      })

      await expect(transport.sendMessages(defaultOptions)).rejects.toThrow(
        'Please configure your API key in the settings'
      )
    })

    it('throws error when API key is only whitespace', async () => {
      queryClient.setQueryData(['chat', 'settings', 'openai'], {
        apiKey: '   ',
        enabledTools: [],
      })

      await expect(transport.sendMessages(defaultOptions)).rejects.toThrow(
        'Please configure your API key in the settings'
      )
    })

    it('calls electron API with correct parameters', async () => {
      ;(window.electronAPI.chat.stream as Mock).mockResolvedValue({
        streamId: 'stream-123',
      })

      const stream = await transport.sendMessages(defaultOptions)

      expect(window.electronAPI.chat.stream as Mock).toHaveBeenCalledWith({
        chatId: 'test-chat',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            parts: [{ type: 'text', text: 'Hello, world!' }],
          },
        ],
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
        enabledTools: [],
      })

      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('handles electron API errors', async () => {
      ;(window.electronAPI.chat.stream as Mock).mockRejectedValue(
        new Error('IPC failed')
      )

      await expect(transport.sendMessages(defaultOptions)).rejects.toThrow(
        'IPC communication failed: IPC failed'
      )
    })

    it('sets up IPC listeners for stream events', async () => {
      ;(window.electronAPI.chat.stream as Mock).mockResolvedValue({
        streamId: 'stream-123',
      })

      await transport.sendMessages(defaultOptions)

      expect(window.electronAPI.on as Mock).toHaveBeenCalledWith(
        'chat:stream:chunk',
        expect.any(Function)
      )
      expect(window.electronAPI.on as Mock).toHaveBeenCalledWith(
        'chat:stream:end',
        expect.any(Function)
      )
      expect(window.electronAPI.on as Mock).toHaveBeenCalledWith(
        'chat:stream:error',
        expect.any(Function)
      )
    })

    it('handles abort signal', async () => {
      const abortController = new AbortController()
      ;(window.electronAPI.chat.stream as Mock).mockResolvedValue({
        streamId: 'stream-123',
      })

      const optionsWithAbort = {
        ...defaultOptions,
        abortSignal: abortController.signal,
      }

      const streamPromise = transport.sendMessages(optionsWithAbort)

      // Abort immediately
      abortController.abort()

      const stream = await streamPromise
      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('handles already aborted signal', async () => {
      const abortController = new AbortController()
      abortController.abort() // Abort before creating stream
      ;(window.electronAPI.chat.stream as Mock).mockResolvedValue({
        streamId: 'stream-123',
      })

      const optionsWithAbort = {
        ...defaultOptions,
        abortSignal: abortController.signal,
      }

      const stream = await transport.sendMessages(optionsWithAbort)
      expect(stream).toBeInstanceOf(ReadableStream)
    })
  })

  describe('stream event handling', () => {
    beforeEach(() => {
      queryClient.setQueryData(['chat', 'selectedModel'], {
        provider: 'openai',
        model: 'gpt-4',
      })
      queryClient.setQueryData(['chat', 'settings', 'openai'], {
        apiKey: 'sk-test-key',
        enabledTools: [],
      })
    })

    it('handles stream chunks correctly', async () => {
      ;(window.electronAPI.chat.stream as Mock).mockResolvedValue({
        streamId: 'stream-123',
      })

      const stream = await transport.sendMessages({
        trigger: 'submit-message',
        chatId: 'test-chat',
        messageId: 'msg-1',
        messages: mockMessages,
        abortSignal: undefined,
      })

      const reader = stream.getReader()

      // Simulate receiving a chunk
      const chunkHandler = (window.electronAPI.on as Mock).mock.calls.find(
        (call) => call[0] === 'chat:stream:chunk'
      )?.[1]

      if (chunkHandler) {
        chunkHandler({
          streamId: 'stream-123',
          chunk: { type: 'text', text: 'Hello' },
        })
      }

      // The chunk is available to read
      const result = await reader.read()
      expect(result.done).toBe(false)
      expect(result.value).toEqual({ type: 'text', text: 'Hello' })

      reader.releaseLock()
    })

    it('handles stream end correctly', async () => {
      ;(window.electronAPI.chat.stream as Mock).mockResolvedValue({
        streamId: 'stream-123',
      })

      const stream = await transport.sendMessages({
        trigger: 'submit-message',
        chatId: 'test-chat',
        messageId: 'msg-1',
        messages: mockMessages,
        abortSignal: undefined,
      })

      const reader = stream.getReader()

      // Simulate stream end
      const endHandler = (window.electronAPI.on as Mock).mock.calls.find(
        (call) => call[0] === 'chat:stream:end'
      )?.[1]

      if (endHandler) {
        endHandler({ streamId: 'stream-123' })
      }

      // The stream is closed
      const result = await reader.read()
      expect(result.done).toBe(true)

      reader.releaseLock()
    })

    it('handles stream errors correctly', async () => {
      ;(window.electronAPI.chat.stream as Mock).mockResolvedValue({
        streamId: 'stream-123',
      })

      const stream = await transport.sendMessages({
        trigger: 'submit-message',
        chatId: 'test-chat',
        messageId: 'msg-1',
        messages: mockMessages,
        abortSignal: undefined,
      })

      const reader = stream.getReader()

      // Simulate stream error
      const errorHandler = (window.electronAPI.on as Mock).mock.calls.find(
        (call) => call[0] === 'chat:stream:error'
      )?.[1]

      if (errorHandler) {
        errorHandler({ streamId: 'stream-123', error: 'Stream failed' })
      }

      // The stream throws an error
      await expect(reader.read()).rejects.toThrow('Stream failed')

      reader.releaseLock()
    })
  })

  describe('reconnectToStream', () => {
    it('returns null when no chatId is provided', async () => {
      const result = await transport.reconnectToStream({ chatId: '' })
      expect(result).toBeNull()
    })

    it('returns null when the main process has no active stream', async () => {
      const resumeStreamMock = vi.fn().mockResolvedValue(null)
      ;(window as unknown as { electronAPI: unknown }).electronAPI = {
        chat: { resumeStream: resumeStreamMock },
        on: vi.fn().mockReturnValue(() => {}),
        removeListener: vi.fn(),
      }

      const result = await transport.reconnectToStream({ chatId: 'thread-1' })
      expect(resumeStreamMock).toHaveBeenCalledWith('thread-1')
      expect(result).toBeNull()
    })

    it('replays synthesized chunks then attaches live IPC listeners', async () => {
      const replayChunks = [
        { type: 'start', messageId: 'msg-x' },
        { type: 'text-start', id: 't1' },
        { type: 'text-delta', id: 't1', delta: 'Hel' },
      ]
      const resumeStreamMock = vi.fn().mockResolvedValue({
        streamId: 'stream-resumed',
        replayChunks,
        toolUiMetadata: null,
      })
      const unsubscribeStreamMock = vi.fn().mockResolvedValue(undefined)

      let chunkHandler: ((...args: unknown[]) => void) | null = null
      let endHandler: ((...args: unknown[]) => void) | null = null
      const offChunk = vi.fn()
      const offEnd = vi.fn()
      const offError = vi.fn()
      const onMock = vi.fn(
        (channel: string, listener: (...args: unknown[]) => void) => {
          if (channel === 'chat:stream:chunk') {
            chunkHandler = listener
            return offChunk
          }
          if (channel === 'chat:stream:end') {
            endHandler = listener
            return offEnd
          }
          if (channel === 'chat:stream:error') {
            return offError
          }
          return () => {}
        }
      )

      ;(window as unknown as { electronAPI: unknown }).electronAPI = {
        chat: {
          resumeStream: resumeStreamMock,
          unsubscribeStream: unsubscribeStreamMock,
        },
        on: onMock,
        removeListener: vi.fn(),
      }

      const stream = await transport.reconnectToStream({ chatId: 'thread-1' })
      expect(stream).not.toBeNull()
      const reader = stream!.getReader()

      // First three reads come from the synthesized replay backlog.
      for (const expected of replayChunks) {
        const { value } = await reader.read()
        expect(value).toEqual(expected)
      }

      // Subsequent live chunk arrives via IPC and reaches the consumer.
      expect(chunkHandler).not.toBeNull()
      chunkHandler!({
        streamId: 'stream-resumed',
        chatId: 'thread-1',
        chunk: { type: 'text-delta', id: 't1', delta: 'lo' },
      })
      const live = await reader.read()
      expect(live.value).toEqual({
        type: 'text-delta',
        id: 't1',
        delta: 'lo',
      })

      // End event closes the stream, unsubscribes from main, and detaches
      // every listener via the unsubscribe handles returned by `on`.
      expect(endHandler).not.toBeNull()
      endHandler!({ streamId: 'stream-resumed', chatId: 'thread-1' })
      const done = await reader.read()
      expect(done.done).toBe(true)
      expect(unsubscribeStreamMock).toHaveBeenCalledWith('thread-1')
      expect(offChunk).toHaveBeenCalledTimes(1)
      expect(offEnd).toHaveBeenCalledTimes(1)
      expect(offError).toHaveBeenCalledTimes(1)

      reader.releaseLock()
    })

    it('detaches all IPC listeners when the consumer cancels the stream', async () => {
      const resumeStreamMock = vi.fn().mockResolvedValue({
        streamId: 'stream-resumed',
        replayChunks: [],
        toolUiMetadata: null,
      })
      const unsubscribeStreamMock = vi.fn().mockResolvedValue(undefined)
      const offChunk = vi.fn()
      const offEnd = vi.fn()
      const offError = vi.fn()
      const onMock = vi.fn((channel: string) => {
        if (channel === 'chat:stream:chunk') return offChunk
        if (channel === 'chat:stream:end') return offEnd
        if (channel === 'chat:stream:error') return offError
        return () => {}
      })

      ;(window as unknown as { electronAPI: unknown }).electronAPI = {
        chat: {
          resumeStream: resumeStreamMock,
          unsubscribeStream: unsubscribeStreamMock,
        },
        on: onMock,
        removeListener: vi.fn(),
      }

      const stream = await transport.reconnectToStream({ chatId: 'thread-1' })
      expect(stream).not.toBeNull()
      await stream!.cancel()

      expect(offChunk).toHaveBeenCalledTimes(1)
      expect(offEnd).toHaveBeenCalledTimes(1)
      expect(offError).toHaveBeenCalledTimes(1)
      expect(unsubscribeStreamMock).toHaveBeenCalledWith('thread-1')
    })
  })
})
