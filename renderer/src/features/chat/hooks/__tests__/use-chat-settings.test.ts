import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useChatSettings } from '../use-chat-settings'
import type { ChatProvider } from '../../types'

// Mock electron API chat methods
const mockChatAPI = {
  getSelectedModel: vi.fn(),
  getSettings: vi.fn(),
  getProviders: vi.fn(),
  saveSelectedModel: vi.fn(),
  saveSettings: vi.fn(),
  clearSettings: vi.fn(),
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
const mockProviders: ChatProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4', 'gpt-3.5-turbo'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: ['claude-3', 'claude-2'],
  },
]

describe('useChatSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    window.electronAPI.chat =
      mockChatAPI as unknown as typeof window.electronAPI.chat

    // Default mock implementations
    mockChatAPI.getSelectedModel.mockResolvedValue({
      provider: 'openai',
      model: 'gpt-4',
    })
    mockChatAPI.getSettings.mockResolvedValue({
      apiKey: 'sk-test-key',
      enabledTools: ['tool1'],
    })
    mockChatAPI.getProviders.mockResolvedValue(mockProviders)
    mockChatAPI.saveSelectedModel.mockResolvedValue({ success: true })
    mockChatAPI.saveSettings.mockResolvedValue({ success: true })
    mockChatAPI.clearSettings.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('loads settings correctly', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      // Wait for the hook to finish loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.settings).toEqual({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
        enabledTools: ['tool1'],
      })
    })

    it('returns empty settings when no selected model', async () => {
      mockChatAPI.getSelectedModel.mockResolvedValue({
        provider: '',
        model: '',
      })

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.settings).toEqual({
        provider: '',
        model: '',
        apiKey: '',
        enabledTools: [],
      })
    })

    it('loads all providers with settings', async () => {
      mockChatAPI.getSettings
        .mockResolvedValueOnce({ apiKey: 'sk-openai-key', enabledTools: [] })
        .mockResolvedValueOnce({
          apiKey: 'sk-anthropic-key',
          enabledTools: ['tool1'],
        })

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.allProvidersWithSettings).toHaveLength(2)
      expect(result.current.allProvidersWithSettings[0]).toEqual({
        provider: mockProviders[0],
        apiKey: 'sk-openai-key',
        hasKey: true,
        enabledTools: [],
      })
      expect(result.current.allProvidersWithSettings[1]).toEqual({
        provider: mockProviders[1],
        apiKey: 'sk-anthropic-key',
        hasKey: true,
        enabledTools: ['tool1'],
      })
    })

    it('handles providers without API keys', async () => {
      mockChatAPI.getSettings
        .mockResolvedValueOnce({ apiKey: '', enabledTools: [] })
        .mockRejectedValueOnce(new Error('No settings'))

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.allProvidersWithSettings).toHaveLength(2)
      expect(result.current.allProvidersWithSettings[0]).toEqual({
        provider: mockProviders[0],
        apiKey: '',
        hasKey: false,
        enabledTools: [],
      })
      expect(result.current.allProvidersWithSettings[1]).toEqual({
        provider: mockProviders[1],
        apiKey: '',
        hasKey: false,
        enabledTools: [],
      })
    })
  })

  describe('updateSettings', () => {
    it('updates selected model when provider or model changes', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.updateSettings({
          provider: 'anthropic',
          model: 'claude-3',
          apiKey: 'sk-test-key',
          enabledTools: ['tool1'],
        })
      })

      expect(mockChatAPI.saveSelectedModel).toHaveBeenCalledWith(
        'anthropic',
        'claude-3'
      )
    })

    it('does not update selected model when unchanged', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.updateSettings({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-new-key',
        enabledTools: ['tool2'],
      })

      expect(mockChatAPI.saveSelectedModel).not.toHaveBeenCalled()
    })

    it('does not update provider settings (only updates selected model)', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.updateSettings({
        provider: 'anthropic',
        model: 'claude-3',
        apiKey: 'sk-new-key',
        enabledTools: ['tool2'],
      })

      expect(mockChatAPI.saveSettings).not.toHaveBeenCalled()
      expect(mockChatAPI.clearSettings).not.toHaveBeenCalled()
    })

    it('handles errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockChatAPI.saveSelectedModel.mockRejectedValue(new Error('Save failed'))

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await expect(
        result.current.updateSettings({
          provider: 'anthropic',
          model: 'claude-3',
          apiKey: 'sk-test-key',
          enabledTools: [],
        })
      ).rejects.toThrow('Save failed')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update settings:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })
  })

  describe('updateEnabledTools', () => {
    it('updates enabled tools with correct API key', async () => {
      mockChatAPI.getSettings.mockResolvedValue({
        apiKey: 'sk-current-key',
        enabledTools: ['old-tool'],
      })

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.updateEnabledTools(['new-tool', 'another-tool'])

      expect(mockChatAPI.getSettings).toHaveBeenCalledWith('openai')
      expect(mockChatAPI.saveSettings).toHaveBeenCalledWith('openai', {
        apiKey: 'sk-current-key',
        enabledTools: ['new-tool', 'another-tool'],
      })
    })

    it('does nothing when no provider is selected', async () => {
      mockChatAPI.getSelectedModel.mockResolvedValue({
        provider: '',
        model: '',
      })

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.updateEnabledTools(['tool1'])

      expect(mockChatAPI.saveSettings).not.toHaveBeenCalled()
    })

    it('handles errors when getting current settings', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockChatAPI.getSettings.mockRejectedValue(new Error('Get failed'))

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await expect(
        result.current.updateEnabledTools(['tool1'])
      ).rejects.toThrow('Get failed')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update enabled tools:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })
  })

  describe('loadPersistedSettings', () => {
    it('loads first model for a provider', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.loadPersistedSettings('anthropic')

      expect(mockChatAPI.getProviders).toHaveBeenCalled()
      expect(mockChatAPI.saveSelectedModel).toHaveBeenCalledWith(
        'anthropic',
        'claude-3'
      )
    })

    it('does nothing when provider has no models', async () => {
      mockChatAPI.getProviders.mockResolvedValue([
        {
          id: 'empty-provider',
          name: 'Empty Provider',
          models: [],
        },
      ])

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.loadPersistedSettings('empty-provider')

      expect(mockChatAPI.saveSelectedModel).not.toHaveBeenCalled()
    })

    it('does nothing when provider is not found', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.loadPersistedSettings('nonexistent-provider')

      expect(mockChatAPI.saveSelectedModel).not.toHaveBeenCalled()
    })

    it('does nothing when no provider ID provided', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Clear any calls from hook initialization
      vi.clearAllMocks()

      await result.current.loadPersistedSettings('')

      expect(mockChatAPI.getProviders).not.toHaveBeenCalled()
      expect(mockChatAPI.saveSelectedModel).not.toHaveBeenCalled()
    })

    it('handles errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockChatAPI.getProviders.mockRejectedValue(new Error('Providers failed'))

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await expect(
        result.current.loadPersistedSettings('anthropic')
      ).rejects.toThrow('Providers failed')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load persisted settings:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })
  })

  describe('provider settings mutation', () => {
    it('saves settings when API key is provided', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.updateProviderSettingsMutation.mutateAsync({
        provider: 'openai',
        settings: {
          apiKey: 'sk-new-key',
          enabledTools: ['tool1', 'tool2'],
        },
      })

      expect(mockChatAPI.saveSettings).toHaveBeenCalledWith('openai', {
        apiKey: 'sk-new-key',
        enabledTools: ['tool1', 'tool2'],
      })
    })

    it('saves empty settings when API key is empty', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.updateProviderSettingsMutation.mutateAsync({
        provider: 'openai',
        settings: {
          apiKey: '',
          enabledTools: [],
        },
      })

      expect(mockChatAPI.saveSettings).toHaveBeenCalledWith('openai', {
        apiKey: '',
        enabledTools: [],
      })
    })

    it('saves whitespace settings when API key is only whitespace', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.updateProviderSettingsMutation.mutateAsync({
        provider: 'openai',
        settings: {
          apiKey: '   ',
          enabledTools: [],
        },
      })

      expect(mockChatAPI.saveSettings).toHaveBeenCalledWith('openai', {
        apiKey: '   ',
        enabledTools: [],
      })
    })
  })

  describe('loading states', () => {
    it('shows loading when selected model is loading', async () => {
      // Create a promise that we can control
      let resolveSelectedModel: (value: {
        provider: string
        model: string
      }) => void
      const selectedModelPromise = new Promise((resolve) => {
        resolveSelectedModel = resolve
      })
      mockChatAPI.getSelectedModel.mockReturnValue(selectedModelPromise)

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      expect(result.current.isLoading).toBe(true)

      // Resolve the promise
      resolveSelectedModel!({ provider: 'openai', model: 'gpt-4' })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('shows loading when provider settings are loading', async () => {
      // Mock selected model to load immediately
      mockChatAPI.getSelectedModel.mockResolvedValue({
        provider: 'openai',
        model: 'gpt-4',
      })

      // Create a promise that we can control for provider settings
      let resolveProviderSettings: (value: {
        apiKey: string
        enabledTools: string[]
      }) => void
      const providerSettingsPromise = new Promise((resolve) => {
        resolveProviderSettings = resolve
      })
      mockChatAPI.getSettings.mockReturnValue(providerSettingsPromise)

      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      // Resolve the provider settings promise
      resolveProviderSettings!({ apiKey: 'sk-test-key', enabledTools: [] })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('shows loading when mutations are pending', async () => {
      const { Wrapper } = createTestUtils()
      const { result } = renderHook(() => useChatSettings(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Create a promise that we can control for the mutation
      let resolveMutation: (value: { success: boolean }) => void
      const mutationPromise = new Promise((resolve) => {
        resolveMutation = resolve
      })
      mockChatAPI.saveSelectedModel.mockReturnValue(mutationPromise)

      // Start the mutation (don't await it yet)
      const mutationPromise2 = result.current.updateSettings({
        provider: 'anthropic',
        model: 'claude-3',
        apiKey: 'sk-test-key',
        enabledTools: [],
      })

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      // Resolve the mutation
      resolveMutation!({ success: true })
      await mutationPromise2

      // Should not be loading anymore
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })
})
