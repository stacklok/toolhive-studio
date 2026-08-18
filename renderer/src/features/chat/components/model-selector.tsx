import log from 'electron-log/renderer'
import { useQueryClient } from '@tanstack/react-query'
import { ModelPicker, type ModelSelection } from './model-picker'
import type { ChatSettings } from '../types'
import {
  isHarnessProvider,
  getHarnessClientType,
  HARNESS_GROUP_NAME,
} from '../lib/utils'
import { useManageClients } from '@/features/clients/hooks/use-manage-clients'
import { trackEvent } from '@/common/lib/analytics'

interface ModelSelectorProps {
  settings: ChatSettings
  onSettingsChange: (settings: ChatSettings) => void
  onOpenSettings: () => void
  onProviderChange?: (providerId: string) => void
}

export function ModelSelector({
  settings,
  onSettingsChange,
  onOpenSettings,
}: ModelSelectorProps) {
  // Harness providers (Cursor Agent, via ACP) need no manual credentials —
  // instead, the moment one is selected here we register it as a ToolHive
  // client (same mechanism as Manage Clients) so its running MCP servers
  // reach the spawned agent process.
  const {
    installedClients,
    defaultValues,
    getClientFieldName,
    addClientToGroup,
  } = useManageClients(HARNESS_GROUP_NAME)
  const queryClient = useQueryClient()

  const ensureHarnessRegistered = async (provider: string) => {
    const clientType = getHarnessClientType(provider)
    if (!clientType) return

    const isInstalled = installedClients.some(
      (c) => c.client_type === clientType
    )
    const isRegistered = defaultValues[getClientFieldName(clientType)] ?? false
    if (isInstalled && !isRegistered) {
      await addClientToGroup(clientType, HARNESS_GROUP_NAME)
    }
    // Needed regardless of registration outcome — this app's credential
    // gating (hasCredentials, the composer, the pre-send check) all key off
    // a truthy apiKey, and harness providers have no real key to store.
    await window.electronAPI.chat.saveSettings(provider, {
      apiKey: 'enabled',
      enabledTools: [],
    })
    queryClient.invalidateQueries({ queryKey: ['chat', 'settings', provider] })
    queryClient.invalidateQueries({
      queryKey: ['chat', 'allProvidersWithSettings'],
    })
    queryClient.invalidateQueries({ queryKey: ['chat', 'availableModels'] })
  }

  const handleModelSelect = async ({ provider, model }: ModelSelection) => {
    trackEvent(`Playground: select model ${model}`, { provider })

    if (provider === settings.provider) {
      onSettingsChange({ ...settings, model })
      return
    }

    try {
      if (isHarnessProvider(provider)) {
        await ensureHarnessRegistered(provider)
      }

      const providerSettings =
        await window.electronAPI.chat.getSettings(provider)

      const newSettings: ChatSettings =
        provider === 'ollama' || provider === 'lmstudio'
          ? {
              provider,
              model,
              endpointURL:
                'endpointURL' in providerSettings
                  ? providerSettings.endpointURL
                  : '',
              enabledTools: settings.enabledTools,
            }
          : {
              provider,
              model,
              apiKey:
                'apiKey' in providerSettings ? providerSettings.apiKey : '',
              enabledTools: settings.enabledTools,
            }

      onSettingsChange(newSettings)
    } catch (error) {
      log.error('Failed to load provider settings:', error)
    }
  }

  const value: ModelSelection | null =
    settings.provider && settings.model
      ? { provider: settings.provider, model: settings.model }
      : null

  return (
    <ModelPicker
      value={value}
      onChange={handleModelSelect}
      onOpenSettings={onOpenSettings}
    />
  )
}
