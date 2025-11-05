import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { ChatProvider } from '../types'
import { hasValidCredentials } from '../lib/utils'

interface AvailableProvider extends ChatProvider {
  hasCredentials: boolean
}

export function useAvailableModels() {
  const { data: availableProviders = [], isLoading } = useQuery<
    AvailableProvider[]
  >({
    queryKey: ['chat', 'availableModels'],
    queryFn: async () => {
      const providers: ChatProvider[] =
        await window.electronAPI.chat.getProviders()

      const providersWithCredentials = await Promise.all(
        providers.map(async (provider) => {
          try {
            const settings = await window.electronAPI.chat.getSettings(
              provider.id
            )

            return {
              ...provider,
              hasCredentials: hasValidCredentials(settings),
            }
          } catch {
            return {
              ...provider,
              hasCredentials: false,
            }
          }
        })
      )

      return providersWithCredentials
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  })

  const providersWithCredentials = useMemo(
    () => availableProviders.filter((provider) => provider.hasCredentials),
    [availableProviders]
  )

  return {
    availableProviders,
    providersWithCredentials,
    isLoading,
  }
}
