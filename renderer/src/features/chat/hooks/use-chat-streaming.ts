import { useState, useCallback, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import type { ChatUIMessage, ChatSettings } from '../types'
import { ElectronIPCChatTransport } from '../transport/electron-ipc-chat-transport'

export function useChatStreaming() {
  // Create custom IPC transport that always gets current settings from IPC store
  const ipcTransport = useMemo(
    () =>
      new ElectronIPCChatTransport({
        getSettings: async () => {
          try {
            // Always get the latest selected model and settings from IPC store
            const model = await window.electronAPI.chat.getSelectedModel()
            if (!model.provider || !model.model) {
              return { provider: '', model: '', apiKey: '', enabledTools: [] }
            }

            const providerSettings = await window.electronAPI.chat.getSettings(
              model.provider
            )
            return {
              provider: model.provider,
              model: model.model,
              apiKey: providerSettings.apiKey || '',
              enabledTools: providerSettings.enabledTools || [],
            }
          } catch (error) {
            console.error('Failed to get settings from IPC store:', error)
            return { provider: '', model: '', apiKey: '', enabledTools: [] }
          }
        },
      }),
    []
  )

  // Use official AI SDK useChat with our custom transport and typed messages
  const { messages, sendMessage, status, error, stop, setMessages } =
    useChat<ChatUIMessage>({
      id: 'toolhive-chat', // Add stable ID to prevent re-initialization
      transport: ipcTransport,
    })

  // Convert status to our isLoading format
  const isLoading = status === 'submitted' || status === 'streaming'

  // Get current settings from IPC store (for UI display)
  const [settings, setSettings] = useState<ChatSettings>({
    provider: '',
    model: '',
    apiKey: '',
    enabledTools: [],
  })

  const refreshSettings = useCallback(async () => {
    try {
      const model = await window.electronAPI.chat.getSelectedModel()
      if (model.provider && model.model) {
        const providerSettings = await window.electronAPI.chat.getSettings(
          model.provider
        )
        setSettings({
          provider: model.provider,
          model: model.model,
          apiKey: providerSettings.apiKey || '',
          enabledTools: providerSettings.enabledTools || [],
        })
      } else {
        setSettings({
          provider: '',
          model: '',
          apiKey: '',
          enabledTools: [],
        })
      }
    } catch (error) {
      console.error('Failed to refresh settings:', error)
      setSettings({
        provider: '',
        model: '',
        apiKey: '',
        enabledTools: [],
      })
    }
  }, [])

  const updateSettings = useCallback(
    async (newSettings: ChatSettings) => {
      try {
        // Save to IPC store first
        await window.electronAPI.chat.saveSelectedModel(
          newSettings.provider,
          newSettings.model
        )
        await window.electronAPI.chat.saveSettings(newSettings.provider, {
          apiKey: newSettings.apiKey,
          enabledTools: newSettings.enabledTools || [],
        })
        // Then refresh local state from IPC store
        await refreshSettings()
      } catch (err) {
        console.error('Failed to save settings:', err)
      }
    },
    [refreshSettings]
  )

  const handleSendMessage = useCallback(
    async (content: string) => {
      // Validation is now handled in the transport layer using IPC store
      await sendMessage({ text: content })
    },
    [sendMessage]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [setMessages])

  const loadPersistedSettings = useCallback(
    async (providerId: string, preserveEnabledTools = false) => {
      if (!providerId) return

      try {
        const persistedSettings =
          await window.electronAPI.chat.getSettings(providerId)
        const currentModel = await window.electronAPI.chat.getSelectedModel()

        // Update the selected model if provider changed
        if (currentModel.provider !== providerId) {
          // Get the first available model for this provider
          const providers = await window.electronAPI.chat.getProviders()
          const provider = providers.find((p) => p.id === providerId)
          if (provider && provider.models.length > 0) {
            const firstModel = provider.models[0]
            if (firstModel) {
              await window.electronAPI.chat.saveSelectedModel(
                providerId,
                firstModel
              )
            }
          }
        }

        // Save settings to IPC store if preserving tools
        if (
          preserveEnabledTools &&
          settings.enabledTools &&
          settings.enabledTools.length > 0
        ) {
          await window.electronAPI.chat.saveSettings(providerId, {
            apiKey: persistedSettings.apiKey || '',
            enabledTools: settings.enabledTools,
          })
        }

        // Refresh settings from IPC store
        await refreshSettings()
      } catch (err) {
        console.error('Failed to load persisted settings:', err)
      }
    },
    [refreshSettings, settings.enabledTools]
  )

  // Load persisted model selection on mount and listen for changes
  useEffect(() => {
    // Initial load
    refreshSettings()

    // Listen for API key changes and refresh settings
    const handleApiKeysChanged = () => {
      refreshSettings()
    }

    window.addEventListener('api-keys-changed', handleApiKeysChanged)
    return () => {
      window.removeEventListener('api-keys-changed', handleApiKeysChanged)
    }
  }, [refreshSettings])

  // Process error to handle different error formats
  const processError = (error: unknown): string | null => {
    if (!error) return null

    // If it's already a string, return it
    if (typeof error === 'string') return error

    // If it's an Error object, return the message
    if (error instanceof Error) return error.message

    // If it's a structured error object (like {"type":"overloaded_error","message":"Overloaded"})
    if (typeof error === 'object' && error !== null) {
      // Try to extract message from various possible structures
      if ('message' in error && typeof error.message === 'string') {
        return error.message
      }
      if ('error' in error && typeof error.error === 'string') {
        return error.error
      }
      // If it's a JSON-like object, try to stringify it nicely
      try {
        const errorObj = error as Record<string, unknown>
        if (errorObj.type === 'overloaded_error') {
          return 'The AI service is currently overloaded. Please try again in a few moments.'
        }
        // For other structured errors, return the JSON string as fallback
        return JSON.stringify(error)
      } catch {
        return 'An unknown error occurred'
      }
    }

    return 'An unknown error occurred'
  }

  // Memoize the processed error to avoid recalculating on every render
  const processedError = useMemo(() => processError(error), [error])

  return useMemo(
    () => ({
      messages,
      isLoading,
      error: processedError,
      settings,
      sendMessage: handleSendMessage,
      clearMessages,
      cancelRequest: stop,
      updateSettings,
      loadPersistedSettings,
      setMessages, // Expose setMessages for sessionStorage restoration
    }),
    [
      messages,
      isLoading,
      processedError,
      settings,
      handleSendMessage,
      clearMessages,
      stop,
      updateSettings,
      loadPersistedSettings,
      setMessages,
    ]
  )
}
