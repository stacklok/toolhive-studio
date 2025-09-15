import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { ElectronIPCChatTransport } from '../electron-ipc-chat-transport'
import type { ChatUIMessage } from '../../types'

// Mock the global window.electronAPI
const mockElectronAPI = {
  chat: {
    stream: vi.fn(),
  },
  on: vi.fn(),
  removeListener: vi.fn(),
}

// Mock window object
Object.defineProperty(global, 'window', {
  value: {
    electronAPI: mockElectronAPI,
    HTMLElement: global.HTMLElement || class HTMLElement {},
  },
  writable: true,
})

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
      mockElectronAPI.chat.stream.mockResolvedValue({ streamId: 'stream-123' })

      const stream = await transport.sendMessages(defaultOptions)

      expect(mockElectronAPI.chat.stream).toHaveBeenCalledWith({
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
      mockElectronAPI.chat.stream.mockRejectedValue(new Error('IPC failed'))

      await expect(transport.sendMessages(defaultOptions)).rejects.toThrow(
        'IPC communication failed: IPC failed'
      )
    })

    it('sets up IPC listeners for stream events', async () => {
      mockElectronAPI.chat.stream.mockResolvedValue({ streamId: 'stream-123' })

      await transport.sendMessages(defaultOptions)

      expect(mockElectronAPI.on).toHaveBeenCalledWith(
        'chat:stream:chunk',
        expect.any(Function)
      )
      expect(mockElectronAPI.on).toHaveBeenCalledWith(
        'chat:stream:end',
        expect.any(Function)
      )
      expect(mockElectronAPI.on).toHaveBeenCalledWith(
        'chat:stream:error',
        expect.any(Function)
      )
    })

    it('handles abort signal', async () => {
      const abortController = new AbortController()
      mockElectronAPI.chat.stream.mockResolvedValue({ streamId: 'stream-123' })

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

      mockElectronAPI.chat.stream.mockResolvedValue({ streamId: 'stream-123' })

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
      mockElectronAPI.chat.stream.mockResolvedValue({ streamId: 'stream-123' })

      const stream = await transport.sendMessages({
        trigger: 'submit-message',
        chatId: 'test-chat',
        messageId: 'msg-1',
        messages: mockMessages,
        abortSignal: undefined,
      })

      const reader = stream.getReader()

      // Simulate receiving a chunk
      const chunkHandler = mockElectronAPI.on.mock.calls.find(
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
      mockElectronAPI.chat.stream.mockResolvedValue({ streamId: 'stream-123' })

      const stream = await transport.sendMessages({
        trigger: 'submit-message',
        chatId: 'test-chat',
        messageId: 'msg-1',
        messages: mockMessages,
        abortSignal: undefined,
      })

      const reader = stream.getReader()

      // Simulate stream end
      const endHandler = mockElectronAPI.on.mock.calls.find(
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
      mockElectronAPI.chat.stream.mockResolvedValue({ streamId: 'stream-123' })

      const stream = await transport.sendMessages({
        trigger: 'submit-message',
        chatId: 'test-chat',
        messageId: 'msg-1',
        messages: mockMessages,
        abortSignal: undefined,
      })

      const reader = stream.getReader()

      // Simulate stream error
      const errorHandler = mockElectronAPI.on.mock.calls.find(
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
    it('returns null (not implemented)', async () => {
      const result = await transport.reconnectToStream()
      expect(result).toBeNull()
    })
  })
})
