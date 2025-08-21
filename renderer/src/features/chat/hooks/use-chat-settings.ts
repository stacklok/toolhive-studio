import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { ChatSettings } from '../types'

// Query keys
const CHAT_SETTINGS_KEYS = {
  selectedModel: ['chat', 'selectedModel'] as const,
  settings: (provider: string) => ['chat', 'settings', provider] as const,
  allSettings: ['chat', 'settings'] as const,
}

function useSelectedModel() {
  return useQuery({
    queryKey: CHAT_SETTINGS_KEYS.selectedModel,
    queryFn: () => window.electronAPI.chat.getSelectedModel(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })
}

function useProviderSettings(provider: string) {
  return useQuery({
    queryKey: CHAT_SETTINGS_KEYS.settings(provider),
    queryFn: () => window.electronAPI.chat.getSettings(provider),
    enabled: !!provider,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  const isLoading =
    isSelectedModelLoading ||
    (selectedModel?.provider && isProviderSettingsLoading)

  // Combine the data into a single ChatSettings object
  const settings: ChatSettings = useMemo(
    () => ({
      provider: selectedModel?.provider || '',
      model: selectedModel?.model || '',
      apiKey: providerSettings?.apiKey || '',
      enabledTools: providerSettings?.enabledTools || [],
    }),
    [
      selectedModel?.provider,
      selectedModel?.model,
      providerSettings?.apiKey,
      providerSettings?.enabledTools,
    ]
  )

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
    }) => window.electronAPI.chat.saveSettings(provider, newSettings),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: CHAT_SETTINGS_KEYS.settings(variables.provider),
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

        // Update provider settings if changed
        if (newSettings.provider) {
          await updateProviderSettingsMutation.mutateAsync({
            provider: newSettings.provider,
            settings: {
              apiKey: newSettings.apiKey,
              enabledTools: newSettings.enabledTools || [],
            },
          })
        }
      } catch (error) {
        console.error('Failed to update settings:', error)
        throw error
      }
    },
    [
      selectedModel?.provider,
      selectedModel?.model,
      updateSelectedModelMutation,
      updateProviderSettingsMutation,
    ]
  )

  // Update only enabled tools
  const updateEnabledTools = useCallback(
    async (tools: string[]) => {
      if (!selectedModel?.provider) return

      try {
        await updateProviderSettingsMutation.mutateAsync({
          provider: selectedModel.provider,
          settings: {
            apiKey: providerSettings?.apiKey || '',
            enabledTools: tools,
          },
        })
      } catch (error) {
        console.error('Failed to update enabled tools:', error)
        throw error
      }
    },
    [
      selectedModel?.provider,
      updateProviderSettingsMutation,
      providerSettings?.apiKey,
    ]
  )

  // Load persisted settings for a provider
  const loadPersistedSettings = useCallback(
    async (providerId: string, preserveEnabledTools = false) => {
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

        // If preserving enabled tools, update the provider settings
        if (
          preserveEnabledTools &&
          providerSettings?.enabledTools &&
          providerSettings.enabledTools.length > 0
        ) {
          const currentProviderSettings =
            await window.electronAPI.chat.getSettings(providerId)
          await updateProviderSettingsMutation.mutateAsync({
            provider: providerId,
            settings: {
              apiKey: currentProviderSettings.apiKey || '',
              enabledTools: providerSettings.enabledTools || [],
            },
          })
        }
      } catch (error) {
        console.error('Failed to load persisted settings:', error)
        throw error
      }
    },
    [
      providerSettings?.enabledTools,
      updateProviderSettingsMutation,
      updateSelectedModelMutation,
    ]
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
      loadPersistedSettings,
      isLoading: combinedIsLoading,
    }),
    [
      settings,
      updateSettings,
      updateEnabledTools,
      loadPersistedSettings,
      combinedIsLoading,
    ]
  )

  return result
}
