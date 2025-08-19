import { useState, useEffect } from 'react'
import type { ChatProvider } from '../types'

interface AvailableProvider extends ChatProvider {
  hasApiKey: boolean
}

export function useAvailableModels() {
  const [availableProviders, setAvailableProviders] = useState<
    AvailableProvider[]
  >([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchAvailableModels() {
      try {
        setIsLoading(true)

        // Get all providers
        const providers: ChatProvider[] =
          await window.electronAPI.chat.getProviders()

        // Check which providers have API keys
        const providersWithApiKeys = await Promise.all(
          providers.map(async (provider) => {
            try {
              const settings = await window.electronAPI.chat.getSettings(
                provider.id
              )
              return {
                ...provider,
                hasApiKey: Boolean(settings.apiKey),
              }
            } catch {
              return {
                ...provider,
                hasApiKey: false,
              }
            }
          })
        )

        setAvailableProviders(providersWithApiKeys)
      } catch (error) {
        console.error('Failed to fetch available models:', error)
        setAvailableProviders([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAvailableModels()

    // Listen for API key changes
    const handleApiKeysChanged = () => {
      fetchAvailableModels()
    }

    window.addEventListener('api-keys-changed', handleApiKeysChanged)
    return () => {
      window.removeEventListener('api-keys-changed', handleApiKeysChanged)
    }
  }, [])

  // Filter to only providers with API keys
  const providersWithApiKeys = availableProviders.filter(
    (provider) => provider.hasApiKey
  )

  return {
    availableProviders,
    providersWithApiKeys,
    isLoading,
  }
}
