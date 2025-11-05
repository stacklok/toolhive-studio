import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { ChatSettings, ChatProvider } from '../types'
import {
  isLocalServerSettings,
  providerHasApiKey as hasApiKey,
} from '../lib/utils'

export type ProviderWithSettings =
  | {
      provider: ChatProvider & { id: 'ollama' | 'lmstudio' }
      endpointURL: string
      hasKey: boolean
      enabledTools: string[]
    }
  | {
      provider: ChatProvider & { id: string }
      apiKey: string
      hasKey: boolean
      enabledTools: string[]
    }

export function isLocalServerProvider(
  provider: ProviderWithSettings
): provider is Extract<ProviderWithSettings, { endpointURL: string }> {
  return (
    (provider.provider.id === 'ollama' ||
      provider.provider.id === 'lmstudio') &&
    'endpointURL' in provider
  )
}

export function getProviderCredential(provider: ProviderWithSettings): string {
  return isLocalServerProvider(provider)
    ? provider.endpointURL
    : provider.apiKey
}

function isChatProviderLocalServer(
  provider: ChatProvider
): provider is ChatProvider & { id: 'ollama' | 'lmstudio' } {
  return provider.id === 'ollama' || provider.id === 'lmstudio'
}

// Query keys
const CHAT_SETTINGS_KEYS = {
  selectedModel: ['chat', 'selectedModel'] as const,
  settings: (provider: ChatProvider | string) =>
    ['chat', 'settings', provider] as const,
  allSettings: ['chat', 'settings'] as const,
  allProvidersWithSettings: ['chat', 'allProvidersWithSettings'] as const,
}

function useSelectedModel() {
  return useQuery({
    queryKey: CHAT_SETTINGS_KEYS.selectedModel,
    queryFn: () => window.electronAPI.chat.getSelectedModel(),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })
}

function useProviderSettings(provider: string) {
  return useQuery({
    queryKey: CHAT_SETTINGS_KEYS.settings(provider),
    queryFn: () => window.electronAPI.chat.getSettings(provider),
    enabled: !!provider,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })
}

function useAllProvidersWithSettings() {
  return useQuery({
    queryKey: CHAT_SETTINGS_KEYS.allProvidersWithSettings,
    queryFn: async (): Promise<ProviderWithSettings[]> => {
      const allProviders = await window.electronAPI.chat.getProviders()

      const providersWithSettings = await Promise.all(
        allProviders.map(async (provider): Promise<ProviderWithSettings> => {
          try {
            const settings = await window.electronAPI.chat.getSettings(
              provider.id
            )

            if (isChatProviderLocalServer(provider)) {
              const endpointURL =
                'endpointURL' in settings ? settings.endpointURL || '' : ''
              return {
                provider,
                endpointURL,
                hasKey: Boolean(endpointURL),
                enabledTools: settings.enabledTools || [],
              }
            } else {
              const apiKey = hasApiKey(settings) ? settings.apiKey || '' : ''
              return {
                provider,
                apiKey,
                hasKey: Boolean(apiKey),
                enabledTools: settings.enabledTools || [],
              }
            }
          } catch {
            if (isChatProviderLocalServer(provider)) {
              return {
                provider,
                endpointURL: '',
                hasKey: false,
                enabledTools: [],
              }
            } else {
              return {
                provider,
                apiKey: '',
                hasKey: false,
                enabledTools: [],
              }
            }
          }
        })
      )

      return providersWithSettings
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })
}

// Hook for combined chat settings (selected model + provider settings)
export function useChatSettings() {
  const queryClient = useQueryClient()
  const { data: selectedModel, isLoading: isSelectedModelLoading } =
    useSelectedModel()
  const { data: providerSettings, isLoading: isProviderSettingsLoading } =
    useProviderSettings(selectedModel?.provider || '')
  const {
    data: allProvidersWithSettings,
    isLoading: isAllProviderWithSettingsLoading,
    refetch: refetchProviders,
  } = useAllProvidersWithSettings()

  // Query for enabled MCP servers (this is what the UI uses)
  const { data: enabledMcpServers = [], isLoading: isMcpServersLoading } =
    useQuery({
      queryKey: ['chat', 'enabledMcpServers'],
      queryFn: () => window.electronAPI.chat.getEnabledMcpServersFromTools(),
      refetchOnWindowFocus: false,
    })

  // Query for enabled MCP tools (now automatically filters out stopped servers)
  const { data: enabledMcpTools = {}, isLoading: isMcpToolsLoading } = useQuery(
    {
      queryKey: ['chat', 'enabled-mcp-tools'],
      queryFn: () => window.electronAPI.chat.getEnabledMcpTools(),
      refetchOnWindowFocus: false,
    }
  )

  const isLoading =
    isSelectedModelLoading ||
    (selectedModel?.provider && isProviderSettingsLoading) ||
    isMcpToolsLoading ||
    isMcpServersLoading

  // Combine the data into a single ChatSettings object
  const settings: ChatSettings = useMemo(() => {
    const mcpToolNames: string[] = []

    // Include tools from all servers that are enabled (same as UI)
    for (const serverName of enabledMcpServers) {
      const serverTools = enabledMcpTools[serverName] || []
      mcpToolNames.push(...serverTools)
    }

    // Combine provider tools with MCP tools
    const providerTools = providerSettings?.enabledTools || []
    const allEnabledTools = [...providerTools, ...mcpToolNames]

    // Build settings with proper discriminated union
    if (
      selectedModel?.provider === 'ollama' ||
      selectedModel?.provider === 'lmstudio'
    ) {
      const endpointURL =
        providerSettings && 'endpointURL' in providerSettings
          ? providerSettings.endpointURL || ''
          : ''

      return {
        provider: selectedModel.provider,
        model: selectedModel.model || '',
        endpointURL,
        enabledTools: allEnabledTools,
      }
    } else {
      const apiKey =
        providerSettings && hasApiKey(providerSettings)
          ? providerSettings.apiKey || ''
          : ''

      return {
        provider: selectedModel?.provider || '',
        model: selectedModel?.model || '',
        apiKey,
        enabledTools: allEnabledTools,
      }
    }
  }, [
    selectedModel?.provider,
    selectedModel?.model,
    providerSettings,
    enabledMcpTools,
    enabledMcpServers,
  ])

  // Mutation to update selected model
  const updateSelectedModelMutation = useMutation({
    mutationFn: ({ provider, model }: { provider: string; model: string }) =>
      window.electronAPI.chat.saveSelectedModel(provider, model),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CHAT_SETTINGS_KEYS.selectedModel,
      })
    },
  })

  // Mutation to update provider settings
  const updateProviderSettingsMutation = useMutation({
    mutationFn: ({
      provider,
      settings: newSettings,
    }: {
      provider: string
      settings:
        | { apiKey: string; enabledTools: string[] }
        | { endpointURL: string; enabledTools: string[] }
    }) => {
      const settingsToSave =
        provider === 'ollama' || provider === 'lmstudio'
          ? 'endpointURL' in newSettings
            ? {
                endpointURL: newSettings.endpointURL,
                enabledTools: newSettings.enabledTools,
              }
            : { endpointURL: '', enabledTools: newSettings.enabledTools }
          : 'apiKey' in newSettings
            ? {
                apiKey: newSettings.apiKey,
                enabledTools: newSettings.enabledTools,
              }
            : { apiKey: '', enabledTools: newSettings.enabledTools }
      return window.electronAPI.chat.saveSettings(provider, settingsToSave)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: CHAT_SETTINGS_KEYS.settings(variables.provider),
      })
      queryClient.invalidateQueries({
        queryKey: CHAT_SETTINGS_KEYS.allProvidersWithSettings,
      })
      queryClient.invalidateQueries({
        queryKey: ['chat', 'availableModels'],
      })
    },
  })

  // Combined update function
  const updateSettings = useCallback(
    async (newSettings: ChatSettings) => {
      try {
        // Update selected model if changed
        if (
          newSettings.provider !== selectedModel?.provider ||
          newSettings.model !== selectedModel?.model
        ) {
          await updateSelectedModelMutation.mutateAsync({
            provider: newSettings.provider,
            model: newSettings.model,
          })
        }
      } catch (error) {
        console.error('Failed to update settings:', error)
        throw error
      }
    },
    [selectedModel?.provider, selectedModel?.model, updateSelectedModelMutation]
  )

  // Update only enabled tools
  const updateEnabledTools = useCallback(
    async (tools: string[]) => {
      if (!selectedModel?.provider) return

      try {
        const currentProviderSettings =
          await window.electronAPI.chat.getSettings(selectedModel.provider)

        await updateProviderSettingsMutation.mutateAsync({
          provider: selectedModel.provider,
          settings: isLocalServerSettings(currentProviderSettings)
            ? {
                endpointURL: currentProviderSettings.endpointURL || '',
                enabledTools: tools,
              }
            : {
                apiKey: hasApiKey(currentProviderSettings)
                  ? currentProviderSettings.apiKey || ''
                  : '',
                enabledTools: tools,
              },
        })
      } catch (error) {
        console.error('Failed to update enabled tools:', error)
        throw error
      }
    },
    [selectedModel?.provider, updateProviderSettingsMutation]
  )

  // Load persisted settings for a provider
  const loadPersistedSettings = useCallback(
    async (providerId: string) => {
      if (!providerId) return

      try {
        // Get providers to find the first model for this provider
        const providers = await window.electronAPI.chat.getProviders()
        const provider = providers.find((p) => p.id === providerId)

        if (provider && provider.models.length > 0) {
          const firstModel = provider.models[0]
          if (firstModel) {
            await updateSelectedModelMutation.mutateAsync({
              provider: providerId,
              model: firstModel,
            })
          }
        }
      } catch (error) {
        console.error('Failed to load persisted settings:', error)
        throw error
      }
    },
    [updateSelectedModelMutation]
  )

  // Create a stable isLoading value
  const updateSelectedModelPending = updateSelectedModelMutation.isPending
  const updateProviderSettingsPending = updateProviderSettingsMutation.isPending

  const combinedIsLoading = useMemo(
    () =>
      isLoading || updateSelectedModelPending || updateProviderSettingsPending,
    [isLoading, updateSelectedModelPending, updateProviderSettingsPending]
  )

  const result = useMemo(
    () => ({
      settings,
      updateSettings,
      updateEnabledTools,
      updateProviderSettingsMutation,
      loadPersistedSettings,
      allProvidersWithSettings: allProvidersWithSettings || [],
      isLoadingProviders: isAllProviderWithSettingsLoading,
      isLoading: combinedIsLoading,
      refetchProviders,
    }),
    [
      settings,
      updateSettings,
      updateEnabledTools,
      updateProviderSettingsMutation,
      loadPersistedSettings,
      allProvidersWithSettings,
      isAllProviderWithSettingsLoading,
      combinedIsLoading,
      refetchProviders,
    ]
  )

  return result
}
