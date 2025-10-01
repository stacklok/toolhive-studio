import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { ChatProvider } from '../types'

interface AvailableProvider extends ChatProvider {
  hasApiKey: boolean
}

export function useAvailableModels() {
  const { data: availableProviders = [], isLoading } = useQuery<
    AvailableProvider[]
  >({
    queryKey: ['chat', 'availableModels'],
    queryFn: async () => {
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

      return providersWithApiKeys
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  // Filter to only providers with API keys
  const providersWithApiKeys = useMemo(
    () => availableProviders.filter((provider) => provider.hasApiKey),
    [availableProviders]
  )

  return {
    availableProviders,
    providersWithApiKeys,
    isLoading,
  }
}
