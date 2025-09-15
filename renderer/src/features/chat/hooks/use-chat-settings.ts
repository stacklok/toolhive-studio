import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { ChatSettings, ChatProvider } from '../types'

export interface ProviderWithSettings {
  provider: ChatProvider
  apiKey: string
  hasKey: boolean
  enabledTools: string[]
}

// Query keys
const CHAT_SETTINGS_KEYS = {
  selectedModel: ['chat', 'selectedModel'] as const,
  settings: (provider: string) => ['chat', 'settings', provider] as const,
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

      // Load existing API keys for each provider
      const providersWithSettings = await Promise.all(
        allProviders.map(async (provider) => {
          try {
            const settings = await window.electronAPI.chat.getSettings(
              provider.id
            )
            return {
              provider,
              apiKey: settings.apiKey || '',
              hasKey: Boolean(settings.apiKey),
              enabledTools: settings.enabledTools || [],
            }
          } catch {
            return {
              provider,
              apiKey: '',
              hasKey: false,
              enabledTools: [],
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
  const allProvidersWithSettingsQuery = useAllProvidersWithSettings()

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
    // Use the same logic as the UI: only include tools from servers in enabledMcpServers
    const mcpToolNames: string[] = []

    // Get enabled server names (remove 'mcp_' prefix) - same as UI logic
    const enabledServerNames = enabledMcpServers.map((serverId: string) =>
      serverId.replace('mcp_', '')
    )

    // Include tools from all servers that are enabled (same as UI)
    for (const serverName of enabledServerNames) {
      const serverTools = enabledMcpTools[serverName] || []
      mcpToolNames.push(...serverTools)
    }

    // Combine provider tools with MCP tools
    const providerTools = providerSettings?.enabledTools || []
    const allEnabledTools = [...providerTools, ...mcpToolNames]

    return {
      provider: selectedModel?.provider || '',
      model: selectedModel?.model || '',
      apiKey: providerSettings?.apiKey || '',
      enabledTools: allEnabledTools,
    }
  }, [
    selectedModel?.provider,
    selectedModel?.model,
    providerSettings?.apiKey,
    providerSettings?.enabledTools,
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
      settings: { apiKey: string; enabledTools: string[] }
    }) => {
      if (newSettings.apiKey.trim()) {
        // Save API key with settings
        return window.electronAPI.chat.saveSettings(provider, newSettings)
      } else {
        // Clear/remove API key when empty
        return window.electronAPI.chat.clearSettings(provider)
      }
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
          settings: {
            apiKey: currentProviderSettings.apiKey || '',
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
      allProvidersWithSettings: allProvidersWithSettingsQuery.data || [],
      isLoadingProviders: allProvidersWithSettingsQuery.isLoading,
      isLoading: combinedIsLoading,
    }),
    [
      settings,
      updateSettings,
      updateEnabledTools,
      updateProviderSettingsMutation,
      loadPersistedSettings,
      allProvidersWithSettingsQuery.data,
      allProvidersWithSettingsQuery.isLoading,
      combinedIsLoading,
    ]
  )

  return result
}
