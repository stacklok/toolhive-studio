import log from 'electron-log/renderer'
import { ModelPicker, type ModelSelection } from './model-picker'
import type { ChatSettings } from '../types'
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
  const handleModelSelect = async ({ provider, model }: ModelSelection) => {
    trackEvent(`Playground: select model ${model}`, { provider })

    if (provider === settings.provider) {
      onSettingsChange({ ...settings, model })
      return
    }

    try {
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
