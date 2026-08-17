import log from 'electron-log/renderer'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ModelPicker, type ModelSelection } from './model-picker'
import type { ChatSettings } from '../types'
import { trackEvent } from '@/common/lib/analytics'
import { isGatewayProvider, THV_LLM_PROVIDER_ID } from '../lib/gateway-provider'
import { ensureGatewayReady } from '../hooks/use-llm-gateway'
import { LlmGatewayLoginModal } from './llm-gateway-login-modal'

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
  const queryClient = useQueryClient()
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [loginMessage, setLoginMessage] = useState<string | null>(null)
  const [isRetryingLogin, setIsRetryingLogin] = useState(false)
  const [pendingSelection, setPendingSelection] =
    useState<ModelSelection | null>(null)

  const applySelection = async ({ provider, model }: ModelSelection) => {
    const providerSettings = await window.electronAPI.chat.getSettings(provider)

    let newSettings: ChatSettings
    if (provider === 'ollama' || provider === 'lmstudio') {
      newSettings = {
        provider,
        model,
        endpointURL:
          'endpointURL' in providerSettings ? providerSettings.endpointURL : '',
        enabledTools: settings.enabledTools,
      }
    } else if (provider === THV_LLM_PROVIDER_ID) {
      newSettings = {
        provider: THV_LLM_PROVIDER_ID,
        model,
        endpointURL:
          'endpointURL' in providerSettings ? providerSettings.endpointURL : '',
        enabledTools: settings.enabledTools,
      }
    } else {
      newSettings = {
        provider,
        model,
        apiKey: 'apiKey' in providerSettings ? providerSettings.apiKey : '',
        enabledTools: settings.enabledTools,
      }
    }

    onSettingsChange(newSettings)
  }

  const handleModelSelect = async (selection: ModelSelection) => {
    const { provider, model } = selection
    trackEvent(`Playground: select model ${model}`, { provider })

    if (provider === settings.provider) {
      onSettingsChange({ ...settings, model })
      return
    }

    if (isGatewayProvider(provider)) {
      setPendingSelection(selection)
      const ready = await ensureGatewayReady()
      if (!ready.ready) {
        setLoginMessage(ready.error ?? null)
        setLoginModalOpen(true)
        return
      }
      setPendingSelection(null)
    }

    try {
      await applySelection(selection)
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'availableModels'],
      })
    } catch (error) {
      log.error('Failed to load provider settings:', error)
    }
  }

  const handleRetryLogin = async () => {
    if (!pendingSelection) {
      setLoginModalOpen(false)
      return
    }
    setIsRetryingLogin(true)
    try {
      const ready = await ensureGatewayReady()
      if (!ready.ready) {
        setLoginMessage(ready.error ?? null)
        return
      }
      setLoginModalOpen(false)
      setPendingSelection(null)
      await applySelection(pendingSelection)
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'availableModels'],
      })
    } finally {
      setIsRetryingLogin(false)
    }
  }

  const value: ModelSelection | null =
    settings.provider && settings.model
      ? { provider: settings.provider, model: settings.model }
      : null

  return (
    <>
      <ModelPicker
        value={value}
        onChange={handleModelSelect}
        onOpenSettings={onOpenSettings}
      />
      <LlmGatewayLoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onRetry={handleRetryLogin}
        isRetrying={isRetryingLogin}
        message={loginMessage}
      />
    </>
  )
}
