import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Badge } from '@/common/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/common/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { Eye, EyeOff, Check, Trash2, RefreshCw } from 'lucide-react'
import { getProviderIcon } from './provider-icons'
import {
  useChatSettings,
  type ProviderWithSettings,
  isLocalServerProvider,
  getProviderCredential,
} from '../hooks/use-chat-settings'
import { ScrollArea } from '@/common/components/ui/scroll-area'
import { trackEvent } from '@/common/lib/analytics'
import type { ChatSettings } from '../types'
import { hasCredentials } from '../lib/utils'

// Provider-specific configuration for credential input
function getProviderCredentialConfig(providerId: string, providerName: string) {
  if (providerId === 'ollama') {
    return {
      label: 'Server URL',
      placeholder: 'http://localhost:11434',
      isSecret: false,
      helpText:
        'Enter the URL of your Ollama server (default: http://localhost:11434)',
    }
  }

  if (providerId === 'lmstudio') {
    return {
      label: 'Server URL',
      placeholder: 'http://localhost:1234',
      isSecret: false,
      helpText:
        'Enter the URL of your LM Studio server (default: http://localhost:1234)',
    }
  }

  return {
    label: 'API Key',
    placeholder: `Enter your ${providerName} API key`,
    isSecret: true,
    helpText: undefined,
  }
}

interface DialogProviderSettingsProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (providerKeys: ProviderWithSettings[]) => void
}

export function DialogProviderSettings({
  isOpen,
  onOpenChange,
  onSaved,
}: DialogProviderSettingsProps) {
  const queryClient = useQueryClient()
  const [providerKeys, setProviderKeys] = useState<ProviderWithSettings[]>([])
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [expandedProviders, setExpandedProviders] = useState<
    Record<string, boolean>
  >({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [validationStatus, setValidationStatus] = useState<
    Record<string, { valid: boolean; modelCount: number } | null>
  >({})

  const {
    settings,
    updateSettings,
    updateProviderSettingsMutation,
    allProvidersWithSettings,
    isLoadingProviders,
    refetchProviders,
  } = useChatSettings()

  // Update local state when hook data changes
  useEffect(() => {
    if (isOpen && allProvidersWithSettings.length > 0) {
      setProviderKeys(allProvidersWithSettings)

      // Start with all providers collapsed
      const expandedState: Record<string, boolean> = {}
      allProvidersWithSettings.forEach((pk) => {
        expandedState[pk.provider.id] = false
      })
      setExpandedProviders(expandedState)
    }
  }, [isOpen, allProvidersWithSettings])

  const handleApiKeyChange = (providerId: string, value: string) => {
    trackEvent(`Playground: change provider credentials for ${providerId}`)
    setProviderKeys((prev) =>
      prev.map((pk) => {
        if (pk.provider.id !== providerId) return pk

        if (isLocalServerProvider(pk)) {
          return { ...pk, endpointURL: value, hasKey: Boolean(value) }
        } else {
          return { ...pk, apiKey: value, hasKey: Boolean(value) }
        }
      })
    )
    setValidationStatus((prev) => ({
      ...prev,
      [providerId]: null,
    }))
  }

  const toggleShowApiKey = (providerId: string) => {
    trackEvent(`Playground: toggle show provider credentials for ${providerId}`)
    setShowApiKeys((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }))
  }

  const handleRemoveApiKey = (providerId: string) => {
    trackEvent(`Playground: remove provider credentials for ${providerId}`)
    setProviderKeys((prev) =>
      prev.map((pk) => {
        if (pk.provider.id !== providerId) return pk

        if (isLocalServerProvider(pk)) {
          return { ...pk, endpointURL: '', hasKey: false }
        } else {
          return { ...pk, apiKey: '', hasKey: false }
        }
      })
    )
  }

  const toggleProviderExpanded = (providerId: string) => {
    trackEvent(`Playground: toggle provider expanded for ${providerId}`)
    setExpandedProviders((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }))
  }

  const handleRefreshModels = useCallback(
    async (provider: ProviderWithSettings) => {
      trackEvent('Playground: refresh provider models')
      setIsRefreshing(true)
      try {
        if (
          provider.provider.id === 'ollama' ||
          provider.provider.id === 'lmstudio'
        ) {
          const credential = getProviderCredential(provider)
          const result = await window.electronAPI.chat.fetchProviderModels(
            provider.provider.id,
            credential
          )

          setValidationStatus((prev) => ({
            ...prev,
            [provider.provider.id]:
              result && result.models
                ? { valid: true, modelCount: result.models.length }
                : { valid: false, modelCount: 0 },
          }))
        }

        await refetchProviders()
        await queryClient.invalidateQueries({
          queryKey: ['chat', 'availableModels'],
        })
      } finally {
        setIsRefreshing(false)
      }
    },
    [refetchProviders, queryClient]
  )

  const handleSave = useCallback(async () => {
    try {
      trackEvent(`Playground: save provider settings`)
      await Promise.all(
        providerKeys.map(async (pk) => {
          const originalProvider = allProvidersWithSettings.find(
            (p) => p.provider.id === pk.provider.id
          )
          const existingEnabledTools = originalProvider?.enabledTools || []
          const credential = getProviderCredential(pk)

          await updateProviderSettingsMutation.mutateAsync({
            provider: pk.provider.id,
            settings: isLocalServerProvider(pk)
              ? {
                  endpointURL: credential,
                  enabledTools: existingEnabledTools,
                }
              : {
                  apiKey: credential,
                  enabledTools: existingEnabledTools,
                },
          })
        })
      )

      const updatedProvidersWithKeys = providerKeys.filter(
        (pk) => pk.hasKey && getProviderCredential(pk).trim()
      )
      const firstProviderWithCredentials = updatedProvidersWithKeys[0]

      const currentProviderHasCredentials = updatedProvidersWithKeys.some(
        (pk) =>
          pk.provider.id === settings.provider &&
          pk.hasKey &&
          getProviderCredential(pk).trim()
      )

      if (
        firstProviderWithCredentials &&
        (!hasCredentials(settings) || !currentProviderHasCredentials)
      ) {
        const credential = getProviderCredential(firstProviderWithCredentials)
        const newSettings: ChatSettings = isLocalServerProvider(
          firstProviderWithCredentials
        )
          ? {
              provider: firstProviderWithCredentials.provider.id,
              model: firstProviderWithCredentials.provider.models[0] || '',
              endpointURL: credential,
              enabledTools: settings.enabledTools,
            }
          : {
              provider: firstProviderWithCredentials.provider.id,
              model: firstProviderWithCredentials.provider.models[0] || '',
              apiKey: credential,
              enabledTools: settings.enabledTools,
            }

        updateSettings(newSettings)
      }

      onSaved?.(providerKeys)
      onOpenChange(false)
    } catch (error) {
      log.error('Failed to save provider settings:', error)
    }
  }, [
    providerKeys,
    allProvidersWithSettings,
    settings,
    updateSettings,
    updateProviderSettingsMutation,
    onSaved,
    onOpenChange,
  ])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="dialog-provider-settings-description"
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Provider Settings
          </DialogTitle>
          <DialogDescription aria-describedby="Modal for managing provider settings" />
        </DialogHeader>
        <ScrollArea className="max-h-[600px] overflow-y-auto">
          <div className="space-y-3">
            {isLoadingProviders ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">
                  Loading providers...
                </div>
              </div>
            ) : (
              providerKeys.map((pk) => (
                <Collapsible
                  key={pk.provider.id}
                  open={expandedProviders[pk.provider.id]}
                  onOpenChange={() => toggleProviderExpanded(pk.provider.id)}
                  className="border-border overflow-hidden rounded-lg border"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="hover:bg-muted/50 h-auto w-full cursor-pointer
                        justify-between rounded-none p-4"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getProviderIcon(pk.provider.id)}
                          <h3 className="text-left font-medium">
                            {pk.provider.name}
                          </h3>
                        </div>
                        {pk.hasKey && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="mr-1 h-3 w-3" />
                            Configured
                          </Badge>
                        )}
                      </div>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {(() => {
                      const credentialConfig = getProviderCredentialConfig(
                        pk.provider.id,
                        pk.provider.name
                      )
                      return (
                        <div className="border-border/30 bg-muted/10 space-y-3 border-t px-4 pb-4">
                          <div className="space-y-2 pt-2">
                            <div className="space-y-2">
                              <div>
                                <Label
                                  htmlFor={`apikey-${pk.provider.id}`}
                                  className="text-sm font-medium"
                                >
                                  {credentialConfig.label}
                                </Label>
                                {credentialConfig.helpText && (
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {credentialConfig.helpText}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    id={`apikey-${pk.provider.id}`}
                                    type={
                                      credentialConfig.isSecret &&
                                      !showApiKeys[pk.provider.id]
                                        ? 'password'
                                        : 'text'
                                    }
                                    value={getProviderCredential(pk)}
                                    onChange={(e) =>
                                      handleApiKeyChange(
                                        pk.provider.id,
                                        e.target.value
                                      )
                                    }
                                    placeholder={credentialConfig.placeholder}
                                    className="pr-10"
                                  />
                                  {credentialConfig.isSecret && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                      onClick={() =>
                                        toggleShowApiKey(pk.provider.id)
                                      }
                                    >
                                      {showApiKeys[pk.provider.id] ? (
                                        <EyeOff className="text-muted-foreground h-4 w-4" />
                                      ) : (
                                        <Eye className="text-muted-foreground h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRefreshModels(pk)}
                                      disabled={
                                        isRefreshing ||
                                        (pk.provider.id === 'ollama' ||
                                        pk.provider.id === 'lmstudio'
                                          ? !getProviderCredential(pk).trim()
                                          : !pk.hasKey ||
                                            !getProviderCredential(pk).trim())
                                      }
                                      className="px-3"
                                    >
                                      <RefreshCw
                                        className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                                      />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {!getProviderCredential(pk).trim()
                                        ? pk.provider.id === 'ollama' ||
                                          pk.provider.id === 'lmstudio'
                                          ? 'Enter a server URL to fetch available models'
                                          : 'Enter an API key to fetch available models'
                                        : pk.provider.id === 'ollama' ||
                                            pk.provider.id === 'lmstudio'
                                          ? `Fetch available models from the ${pk.provider.name} server URL (will use the current input)`
                                          : 'Fetch available models using the configured API key'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                                {pk.hasKey && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveApiKey(pk.provider.id)
                                    }
                                    className="hover:bg-destructive hover:text-destructive-foreground cursor-pointer px-3"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {validationStatus[pk.provider.id] && (
                              <div
                                className={`rounded-md border p-3 ${
                                  validationStatus[pk.provider.id]?.valid
                                    ? 'border-green-500/20 bg-green-500/10'
                                    : 'border-red-500/20 bg-red-500/10'
                                }`}
                              >
                                <p
                                  className={`text-sm ${
                                    validationStatus[pk.provider.id]?.valid
                                      ? 'text-green-600 dark:text-green-500'
                                      : 'text-red-600 dark:text-red-500'
                                  }`}
                                >
                                  {validationStatus[pk.provider.id]?.valid
                                    ? `✓ Connection successful! Found ${validationStatus[pk.provider.id]?.modelCount} model${validationStatus[pk.provider.id]?.modelCount === 1 ? '' : 's'}.`
                                    : `✗ Connection failed. Please check the URL and ensure ${pk.provider.name} is running.`}
                                </p>
                              </div>
                            )}
                            {pk.hasKey &&
                              pk.provider.models.length === 0 &&
                              !validationStatus[pk.provider.id] &&
                              (isLocalServerProvider(pk)
                                ? pk.endpointURL.trim() !== ''
                                : true) && (
                                <div className="rounded-md border border-yellow-500/20 bg-yellow-500/10 p-3">
                                  <p className="text-sm text-yellow-600 dark:text-yellow-500">
                                    {pk.provider.id === 'ollama' ||
                                    pk.provider.id === 'lmstudio'
                                      ? `${pk.provider.name} server is not running or no models are installed. Please start ${pk.provider.name} and ensure you have models available, then click the refresh button above.`
                                      : 'This provider appears to be offline or has no models available. Click the refresh button above to check again.'}
                                  </p>
                                </div>
                              )}
                          </div>
                        </div>
                      )
                    })()}
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateProviderSettingsMutation.isPending}
            variant="default"
          >
            {updateProviderSettingsMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
