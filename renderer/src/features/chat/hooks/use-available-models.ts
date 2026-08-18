import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { ChatProvider } from '../types'
import {
  hasValidCredentials,
  isHarnessProvider,
  getHarnessClientType,
  HARNESS_GROUP_NAME,
} from '../lib/utils'
import { useManageClients } from '@/features/clients/hooks/use-manage-clients'

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

  // Harness providers need no manual credentials, but they're only usable
  // when the underlying client (e.g. the Cursor CLI) is actually installed —
  // otherwise selecting one would just fail to spawn.
  const { installedClients } = useManageClients(HARNESS_GROUP_NAME)

  const providersWithCredentials = useMemo(
    () =>
      availableProviders.filter((provider) => {
        if (provider.hasCredentials) return true
        if (!isHarnessProvider(provider.id)) return false
        const clientType = getHarnessClientType(provider.id)
        return installedClients.some((c) => c.client_type === clientType)
      }),
    [availableProviders, installedClients]
  )

  return {
    availableProviders,
    providersWithCredentials,
    isLoading,
  }
}
