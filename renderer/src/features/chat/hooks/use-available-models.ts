import { useState, useEffect } from 'react'
import type { ChatProviderInfo } from '../types'

interface AvailableProvider extends ChatProviderInfo {
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
        const providers: ChatProviderInfo[] =
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
  }, [])

  // Filter to only providers with API keys
  const providersWithApiKeys = availableProviders.filter(
    (provider) => provider.hasApiKey
  )

  return {
    availableProviders,
    providersWithApiKeys,
    isLoading,
    refetch: () => {
      setIsLoading(true)
      // Re-trigger the effect
      setAvailableProviders([])
    },
  }
}
