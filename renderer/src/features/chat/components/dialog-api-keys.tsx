import { useState, useEffect, useCallback } from 'react'
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
import { Eye, EyeOff, Check, Trash2 } from 'lucide-react'
import { getProviderIcon } from './provider-icons'
import {
  useChatSettings,
  type ProviderWithSettings,
} from '../hooks/use-chat-settings'
import { ScrollArea } from '@/common/components/ui/scroll-area'
import { trackEvent } from '@/common/lib/analytics'

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

  return {
    label: 'API Key',
    placeholder: `Enter your ${providerName} API key`,
    isSecret: true,
    helpText: undefined,
  }
}

interface DialogApiKeysProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (providerKeys: ProviderWithSettings[]) => void
}

export function DialogApiKeys({
  isOpen,
  onOpenChange,
  onSaved,
}: DialogApiKeysProps) {
  const [providerKeys, setProviderKeys] = useState<ProviderWithSettings[]>([])
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [expandedProviders, setExpandedProviders] = useState<
    Record<string, boolean>
  >({})

  const {
    settings,
    updateSettings,
    updateProviderSettingsMutation,
    allProvidersWithSettings,
    isLoadingProviders,
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

  const handleApiKeyChange = (providerId: string, apiKey: string) => {
    trackEvent(`Playground: change api key for ${providerId}`)
    setProviderKeys((prev) =>
      prev.map((pk) =>
        pk.provider.id === providerId
          ? { ...pk, apiKey, hasKey: Boolean(apiKey) }
          : pk
      )
    )
  }

  const toggleShowApiKey = (providerId: string) => {
    trackEvent(`Playground: toggle show api key for ${providerId}`)
    setShowApiKeys((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }))
  }

  const handleRemoveApiKey = (providerId: string) => {
    trackEvent(`Playground: remove api key for ${providerId}`)
    setProviderKeys((prev) =>
      prev.map((pk) =>
        pk.provider.id === providerId
          ? { ...pk, apiKey: '', hasKey: false }
          : pk
      )
    )
  }

  const toggleProviderExpanded = (providerId: string) => {
    trackEvent(`Playground: toggle provider expanded for ${providerId}`)
    setExpandedProviders((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }))
  }

  const handleSave = useCallback(async () => {
    try {
      trackEvent(`Playground: save api keys`)
      providerKeys.forEach(async (pk) => {
        // Get existing enabled tools from the cached data to preserve them
        const originalProvider = allProvidersWithSettings.find(
          (p) => p.provider.id === pk.provider.id
        )
        const existingEnabledTools = originalProvider?.enabledTools || []

        updateProviderSettingsMutation.mutateAsync({
          provider: pk.provider.id,
          settings: {
            apiKey: pk.apiKey,
            enabledTools: existingEnabledTools,
          },
        })
      })

      // Find the first provider with a valid API key after saving
      const updatedProvidersWithKeys = providerKeys.filter(
        (pk) => pk.hasKey && pk.apiKey.trim()
      )
      const firstProviderWithApiKey = updatedProvidersWithKeys[0]

      // Auto select provider and model in two cases:
      // 1. First time setting an API key (no current API key)
      // 2. Current provider no longer has a valid API key (fallback scenario)
      const currentProviderHasKey = updatedProvidersWithKeys.some(
        (pk) =>
          pk.provider.id === settings.provider && pk.hasKey && pk.apiKey.trim()
      )

      if (
        firstProviderWithApiKey &&
        (!settings.apiKey || !currentProviderHasKey)
      ) {
        updateSettings({
          ...settings,
          apiKey: firstProviderWithApiKey.apiKey,
          provider: firstProviderWithApiKey.provider.id,
          model: firstProviderWithApiKey.provider.models[0] || '',
        })
      }

      onSaved?.(providerKeys)
      onOpenChange(false)
    } catch (error) {
      log.error('Failed to save API keys:', error)
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
        aria-describedby="dialog-api-keys-description"
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Manage API Keys
          </DialogTitle>
          <DialogDescription aria-describedby="Modal for managing provider API keys" />
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
                                    value={pk.apiKey}
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
