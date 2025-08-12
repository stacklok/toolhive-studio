import { useState, useCallback, useRef, useEffect } from 'react'
import type { ChatSettings } from '../types'

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  timestamp?: Date
  parts: Array<{
    type: string
    text?: string
    toolName?: string
    toolCallId?: string
    state?: string
    input?: unknown
    output?: unknown
    errorText?: string
  }>
}

export function useChat() {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<ChatSettings>({
    provider: '',
    model: '',
    apiKey: '',
    enabledTools: [],
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  // Enhanced settings update function that auto-loads API key
  const updateSettings = useCallback(
    async (newSettings: ChatSettings) => {
      // If provider changed, load the API key and settings for that provider
      if (newSettings.provider && newSettings.provider !== settings.provider) {
        try {
          const providerSettings = await window.electronAPI.chat.getSettings(
            newSettings.provider
          )
          setSettings({
            ...newSettings,
            apiKey: providerSettings.apiKey || '',
            enabledTools: providerSettings.enabledTools || [],
          })
        } catch (error) {
          console.error('Failed to load provider settings:', error)
          setSettings(newSettings)
        }
      } else {
        setSettings(newSettings)
      }
    },
    [settings.provider]
  )

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return
      if (!settings.provider || !settings.model || !settings.apiKey) {
        setError('Please configure your AI provider settings first')
        return
      }

      const userMessage: UIMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        timestamp: new Date(),
        parts: [{ type: 'text', text: content.trim() }],
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setError(null)

      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      try {
        // Convert messages to the simpler format expected by the preload interface
        const simplifiedMessages = [...messages, userMessage].map((msg) => ({
          id: msg.id,
          role: msg.role,
          parts: msg.parts
            .filter((part) => part.type === 'text' && part.text)
            .map((part) => ({
              type: part.type,
              text: part.text!,
            })),
        }))

        const request = {
          messages: simplifiedMessages,
          provider: settings.provider,
          model: settings.model,
          apiKey: settings.apiKey,
          enabledTools: settings.enabledTools || [],
        }

        // Call the main process chat handler
        const responseJson = await window.electronAPI.chat.stream(request)

        // Parse the complete UIMessage from the main process
        let assistantMessage: UIMessage

        try {
          const parsedResponse = JSON.parse(responseJson) as UIMessage & {
            timestamp?: string
          }
          assistantMessage = {
            ...parsedResponse,
            // Convert ISO timestamp string back to Date object
            timestamp: parsedResponse.timestamp
              ? new Date(parsedResponse.timestamp)
              : new Date(),
          }
        } catch (parseError) {
          console.error('Failed to parse chat response:', parseError)
          // Fallback to plain text if parsing fails
          assistantMessage = {
            id: `assistant-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: 'assistant',
            timestamp: new Date(),
            parts: [
              { type: 'text', text: 'Error: Failed to parse AI response' },
            ],
          }
        }

        setMessages((prev) => [...prev, assistantMessage])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return // Request was cancelled
        }

        console.error('Chat error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [messages, settings, isLoading]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }, [])

  // Load persisted settings on provider change
  const loadPersistedSettings = useCallback(async (providerId: string) => {
    if (!providerId) return

    try {
      const savedSettings =
        await window.electronAPI.chat.getSettings(providerId)
      if (savedSettings.apiKey) {
        setSettings((prev) => ({
          ...prev,
          apiKey: savedSettings.apiKey,
          enabledTools: savedSettings.enabledTools || [],
        }))
      }
    } catch (error) {
      console.error('Failed to load persisted settings:', error)
    }
  }, [])

  // Load settings when provider changes
  useEffect(() => {
    if (settings.provider) {
      loadPersistedSettings(settings.provider)
    }
  }, [settings.provider, loadPersistedSettings])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const clearAllSettings = useCallback(async () => {
    try {
      await window.electronAPI.chat.clearSettings()
      setSettings({
        provider: '',
        model: '',
        apiKey: '',
        enabledTools: [],
      })
    } catch (error) {
      console.error('Failed to clear all settings:', error)
    }
  }, [])

  return {
    messages,
    isLoading,
    error,
    settings,
    setSettings: updateSettings,
    sendMessage,
    clearMessages,
    stopGeneration,
    clearAllSettings,
  }
}
