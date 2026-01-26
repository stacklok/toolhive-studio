import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useChatStreaming } from '../use-chat-streaming'
import type { ChatUIMessage } from '../../types'
import { useChat } from '@ai-sdk/react'
import { ElectronIPCChatTransport } from '../../transport/electron-ipc-chat-transport'
import { extendElectronAPI } from '@mocks/electronAPI'

const mockUseChatFn = vi.mocked(useChat)
const mockTransportClass = vi.mocked(ElectronIPCChatTransport)

const mockUseChat = {
  id: 'test-chat',
  messages: [] as ChatUIMessage[],
  sendMessage: vi.fn(),
  status: 'idle' as 'idle' | 'submitted' | 'streaming',
  error: undefined as unknown,
  stop: vi.fn(),
  setMessages: vi.fn(),
  input: '',
  setInput: vi.fn(),
  isLoading: false,
  reload: vi.fn(),
  append: vi.fn(),
  regenerate: vi.fn(),
  resumeStream: vi.fn(),
  addToolResult: vi.fn(),
  clearError: vi.fn(),
}

vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(() => mockUseChat),
}))

vi.mock('../../transport/electron-ipc-chat-transport', () => ({
  ElectronIPCChatTransport: vi.fn(function ElectronIPCChatTransport() {
    return {
      config: {},
      getSettingsFromQuery: vi.fn(),
      sendMessages: vi.fn(),
      reconnectToStream: vi.fn(),
    }
  }),
}))

vi.mock('../use-thread-management', () => ({
  useThreadManagement: vi.fn(() => ({
    currentThreadId: 'toolhive-chat',
    isLoading: false,
    error: null,
    loadMessages: vi.fn().mockResolvedValue([]),
    clearMessages: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Get references to the mocked functions after mocking

// Mock electron API chat methods
const mockChatAPI = {
  getSelectedModel: vi.fn(),
  getSettings: vi.fn(),
  getProviders: vi.fn(),
  saveSelectedModel: vi.fn(),
  saveSettings: vi.fn(),
  clearSettings: vi.fn(),
  getAllThreads: vi.fn(),
  setActiveThreadId: vi.fn(),
  createChatThread: vi.fn(),
  getThreadMessagesForTransport: vi.fn(),
  updateThreadMessages: vi.fn(),
}

// Test wrapper with QueryClient
const createTestUtils = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  return { queryClient, Wrapper }
}

// Mock data
const mockMessages: ChatUIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    parts: [{ type: 'text' as const, text: 'Hello, world!' }],
  },
  {
    id: 'msg-2',
    role: 'assistant',
    parts: [{ type: 'text' as const, text: 'Hello! How can I help you?' }],
  },
]

describe('useChatStreaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    extendElectronAPI({
      chat: mockChatAPI as unknown as typeof window.electronAPI.chat,
      getInstanceId: vi.fn(),
    })

    // Suppress React act warnings for these tests
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Default mock implementations for chat settings
    mockChatAPI.getSelectedModel.mockResolvedValue({
      provider: 'openai',
      model: 'gpt-4',
    })
    mockChatAPI.getSettings.mockResolvedValue({
      apiKey: 'sk-test-key',
      enabledTools: [],
    })
    mockChatAPI.getProviders.mockResolvedValue([])
    mockChatAPI.saveSelectedModel.mockResolvedValue({ success: true })
    mockChatAPI.saveSettings.mockResolvedValue({ success: true })
    mockChatAPI.clearSettings.mockResolvedValue({ success: true })
    mockChatAPI.getAllThreads.mockResolvedValue([])
    mockChatAPI.setActiveThreadId.mockResolvedValue({ success: true })
    mockChatAPI.createChatThread.mockResolvedValue({
      success: true,
      threadId: 'toolhive-chat',
    })
    mockChatAPI.getThreadMessagesForTransport.mockResolvedValue([])
    mockChatAPI.updateThreadMessages.mockResolvedValue({ success: true })

    // Reset mockUseChat state to default values
    mockUseChat.messages = []
    mockUseChat.status = 'idle'
    mockUseChat.error = undefined
    mockUseChat.sendMessage.mockReset()
    mockUseChat.stop.mockReset()
    mockUseChat.setMessages.mockReset()
    mockUseChat.reload.mockReset()
    mockUseChat.append.mockReset()
    mockUseChat.regenerate.mockReset()
    mockUseChat.resumeStream.mockReset()
    mockUseChat.addToolResult.mockReset()
    mockUseChat.clearError.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns correct initial state', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.messages).toEqual([])
      expect(result.current.error).toBeNull()
      expect(result.current.settings).toEqual({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
        enabledTools: [],
      })
    })

    it('uses static chat ID', async () => {
      const { Wrapper } = createTestUtils()
      renderHook(() => useChatStreaming(), { wrapper: Wrapper })

      // The useChat mock should be called with the static ID
      expect(mockUseChatFn).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'toolhive-chat',
        })
      )
    })

    it('uses static chat ID regardless of settings', async () => {
      mockChatAPI.getSelectedModel.mockResolvedValue({
        provider: '',
        model: '',
      })

      const { Wrapper } = createTestUtils()
      renderHook(() => useChatStreaming(), { wrapper: Wrapper })

      // Should use static ID even when settings are empty
      expect(mockUseChatFn).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'toolhive-chat',
        })
      )
    })
  })

  describe('loading states', () => {
    it('returns loading when chat status is submitted', async () => {
      mockUseChat.status = 'submitted'

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })
    })

    it('returns loading when chat status is streaming', async () => {
      mockUseChat.status = 'streaming'

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })
    })

    it('returns loading state based on chat status and settings', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('returns not loading when idle', async () => {
      mockUseChat.status = 'idle'

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('sendMessage', () => {
    it('validates settings before sending', async () => {
      // Mock settings without API key
      mockChatAPI.getSettings.mockResolvedValue({
        apiKey: '',
        enabledTools: [],
      })

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await expect(result.current.sendMessage('Hello')).rejects.toThrow(
        'Please configure your AI provider settings first'
      )

      expect(mockUseChat.sendMessage).not.toHaveBeenCalled()
    })

    it('validates provider before sending', async () => {
      mockChatAPI.getSelectedModel.mockResolvedValue({
        provider: '',
        model: 'gpt-4',
      })

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await expect(result.current.sendMessage('Hello')).rejects.toThrow(
        'Please configure your AI provider settings first'
      )
    })

    it('validates model before sending', async () => {
      mockChatAPI.getSelectedModel.mockResolvedValue({
        provider: 'openai',
        model: '',
      })

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await expect(result.current.sendMessage('Hello')).rejects.toThrow(
        'Please configure your AI provider settings first'
      )
    })

    it('calls useChat sendMessage when settings are valid', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.sendMessage('Hello, world!')
      })

      expect(mockUseChat.sendMessage).toHaveBeenCalledWith({
        text: 'Hello, world!',
      })
    })

    it('handles whitespace-only API keys', async () => {
      mockChatAPI.getSettings.mockResolvedValue({
        apiKey: '   ',
        enabledTools: [],
      })

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await expect(result.current.sendMessage('Hello')).rejects.toThrow(
        'Please configure your AI provider settings first'
      )
    })
  })

  describe('clearMessages', () => {
    it('calls setMessages with empty array', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.clearMessages()
      })

      expect(mockUseChat.setMessages).toHaveBeenCalledWith([])
    })
  })

  describe('cancelRequest', () => {
    it('calls stop function from useChat', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.cancelRequest()
      })

      expect(mockUseChat.stop).toHaveBeenCalled()
    })
  })

  describe('error processing', () => {
    it('processes string errors', async () => {
      mockUseChat.error = 'String error message'

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.error).toBe('String error message')
      })
    })

    it('processes Error objects', async () => {
      mockUseChat.error = new Error('Error object message')

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Error object message')
      })
    })

    it('processes overloaded error type', async () => {
      mockUseChat.error = { type: 'overloaded_error' }

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.error).toBe(
          'The AI service is currently overloaded. Please try again in a few moments.'
        )
      })
    })

    it('processes structured errors with message property', async () => {
      mockUseChat.error = { message: 'Structured error message' }

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Structured error message')
      })
    })

    it('processes structured errors with error property', async () => {
      mockUseChat.error = { error: 'Error property message' }

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Error property message')
      })
    })

    it('handles unknown error types', async () => {
      mockUseChat.error = 42 // Number type

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.error).toBe('An unknown error occurred')
      })
    })

    it('handles null/undefined errors', async () => {
      mockUseChat.error = undefined

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })

    it('handles complex objects as JSON fallback', async () => {
      const complexError = { complex: { nested: 'data' }, array: [1, 2, 3] }
      mockUseChat.error = complexError

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.error).toBe(JSON.stringify(complexError))
      })
    })

    it('handles objects that cannot be stringified', async () => {
      const circularRef = { self: null as unknown }
      circularRef.self = circularRef
      mockUseChat.error = circularRef

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.error).toBe('An unknown error occurred')
      })
    })
  })

  describe('settings integration', () => {
    it('exposes settings from useChatSettings', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.settings).toEqual({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
        enabledTools: [],
      })
    })

    it('exposes updateSettings function', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(typeof result.current.updateSettings).toBe('function')
    })

    it('exposes updateEnabledTools function', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(typeof result.current.updateEnabledTools).toBe('function')
    })

    it('exposes loadPersistedSettings function', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(typeof result.current.loadPersistedSettings).toBe('function')
    })
  })

  describe('transport integration', () => {
    it('creates transport with query client', async () => {
      const { Wrapper } = createTestUtils()
      renderHook(() => useChatStreaming(), { wrapper: Wrapper })

      expect(mockTransportClass).toHaveBeenCalledWith({
        queryClient: expect.any(Object),
      })
    })

    it('passes transport to useChat', async () => {
      const { Wrapper } = createTestUtils()
      renderHook(() => useChatStreaming(), { wrapper: Wrapper })

      expect(mockUseChatFn).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: expect.any(Object),
          experimental_throttle: 200,
        })
      )
    })
  })

  describe('message state', () => {
    it('returns messages from useChat', async () => {
      mockUseChat.messages = mockMessages

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.messages).toEqual(mockMessages)
      })
    })

    it('updates when messages change', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatStreaming(), {
        wrapper: Wrapper,
      })

      // Initially should have the messages from mockUseChat
      expect(result.current.messages).toEqual(mockUseChat.messages)
    })
  })
})
