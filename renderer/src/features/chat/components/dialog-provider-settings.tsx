import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Eye, EyeOff, Loader2, Search } from 'lucide-react'
import type { ChatProvider, ChatSettings } from '../types'

interface DialogProviderSettingsProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  settings: ChatSettings
  onSettingsChange: (settings: ChatSettings) => void
}

export function DialogProviderSettings({
  isOpen,
  onOpenChange,
  settings,
  onSettingsChange,
}: DialogProviderSettingsProps) {
  const [providers, setProviders] = useState<ChatProvider[]>([])
  const [showApiKey, setShowApiKey] = useState(false)
  const [localSettings, setLocalSettings] = useState(settings)
  const [isLoadingProviders, setIsLoadingProviders] = useState(false)
  const [providersError, setProvidersError] = useState<string | null>(null)
  const [modelSearchQuery, setModelSearchQuery] = useState('')

  useEffect(() => {
    if (!isOpen) return

    // Fetch available providers from the main process
    setIsLoadingProviders(true)
    setProvidersError(null)

    window.electronAPI.chat
      .getProviders()
      .then((fetchedProviders) => {
        setProviders(fetchedProviders)
        setProvidersError(null)
      })
      .catch((error) => {
        console.error('Failed to fetch providers:', error)
        setProvidersError('Failed to load providers. Please try again.')
      })
      .finally(() => {
        setIsLoadingProviders(false)
      })
  }, [isOpen])

  // Load persisted settings when provider changes
  useEffect(() => {
    if (localSettings.provider && isOpen) {
      window.electronAPI.chat
        .getSettings(localSettings.provider)
        .then((savedSettings) => {
          setLocalSettings((prev) => ({
            ...prev,
            apiKey: savedSettings.apiKey || prev.apiKey,
          }))
        })
        .catch(console.error)
    }
  }, [localSettings.provider, isOpen])

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const selectedProvider = providers.find(
    (p) => p.id === localSettings.provider
  )

  // Format OpenRouter model names for better display
  const formatModelName = (model: string, providerId: string): string => {
    if (providerId !== 'openrouter') return model

    // For OpenRouter models, extract provider and model name
    const parts = model.split('/')
    if (parts.length >= 2) {
      const provider = parts[0]
      const modelName = parts.slice(1).join('/')

      // Capitalize provider name
      const providerName =
        provider
          ?.split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ') || provider

      // Format model name
      const formattedModelName = modelName
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())

      return `${formattedModelName} (${providerName})`
    }

    // Fallback for models without provider prefix
    return model.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!selectedProvider) return []
    if (!modelSearchQuery.trim()) return selectedProvider.models

    const query = modelSearchQuery.toLowerCase()
    return selectedProvider.models.filter((model: string) => {
      const formattedName = formatModelName(
        model,
        selectedProvider.id
      ).toLowerCase()
      const originalName = model.toLowerCase()
      return formattedName.includes(query) || originalName.includes(query)
    })
  }, [selectedProvider, modelSearchQuery])

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId)
    setLocalSettings({
      ...localSettings,
      provider: providerId,
      model: provider?.models[0] || '',
    })
    // Clear search when provider changes
    setModelSearchQuery('')
  }

  const handleModelChange = (model: string) => {
    setLocalSettings({
      ...localSettings,
      model,
    })
  }

  const handleApiKeyChange = (apiKey: string) => {
    setLocalSettings({
      ...localSettings,
      apiKey,
    })
  }

  const handleSave = async () => {
    if (localSettings.provider) {
      // Save settings to the store
      try {
        await window.electronAPI.chat.saveSettings(localSettings.provider, {
          apiKey: localSettings.apiKey,
          enabledTools: [],
        })

        // If this is OpenRouter and we just saved an API key, refetch providers to get the latest models
        if (
          localSettings.provider === 'openrouter' &&
          localSettings.apiKey.trim() !== ''
        ) {
          setIsLoadingProviders(true)
          try {
            const updatedProviders =
              await window.electronAPI.chat.getProviders()
            setProviders(updatedProviders)
          } catch (error) {
            console.error(
              'Failed to refetch providers after saving API key:',
              error
            )
          } finally {
            setIsLoadingProviders(false)
          }
        }
      } catch (error) {
        console.error('Failed to save chat settings:', error)
      }
    }

    onSettingsChange(localSettings)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setLocalSettings(settings) // Reset to original settings
    onOpenChange(false)
  }

  const handleClearSettings = async () => {
    if (localSettings.provider) {
      try {
        await window.electronAPI.chat.clearSettings(localSettings.provider)
        setLocalSettings((prev) => ({
          ...prev,
          apiKey: '',
        }))
      } catch (error) {
        console.error('Failed to clear settings:', error)
      }
    }
  }

  const isComplete =
    localSettings.provider && localSettings.model && localSettings.apiKey
  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>AI Provider Settings</DialogTitle>
          <DialogDescription>
            Configure your AI provider and API key to start chatting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            {providersError ? (
              <div className="rounded bg-red-50 p-2 text-sm text-red-600">
                {providersError}
              </div>
            ) : (
              <Select
                value={localSettings.provider}
                onValueChange={handleProviderChange}
                disabled={isLoadingProviders}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingProviders ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading providers...
                        </div>
                      ) : (
                        'Select provider'
                      )
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{provider.name}</span>
                        {provider.id === 'openrouter' && (
                          <span className="text-muted-foreground text-xs">
                            Gateway to {provider.models.length}+ tool-compatible
                            models from all providers
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Model Selection */}
          {selectedProvider && (
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={localSettings.model}
                onValueChange={handleModelChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {/* Search input for models (especially useful for OpenRouter) */}
                  {selectedProvider.models.length > 10 && (
                    <div
                      className="bg-background sticky top-0 z-10 border-b p-2"
                    >
                      <div className="relative">
                        <Search
                          className="text-muted-foreground absolute top-2.5
                            left-2 h-4 w-4"
                        />
                        <Input
                          placeholder="Search models..."
                          value={modelSearchQuery}
                          onChange={(e) => setModelSearchQuery(e.target.value)}
                          className="h-8 pl-8"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  )}

                  {/* Models list */}
                  <div className="max-h-[250px] overflow-y-auto">
                    {filteredModels.length > 0 ? (
                      filteredModels.map((model: string) => (
                        <SelectItem key={model} value={model}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {formatModelName(model, selectedProvider.id)}
                            </span>
                            {selectedProvider.id === 'openrouter' && (
                              <span className="text-muted-foreground text-xs">
                                {model}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div
                        className="text-muted-foreground p-2 text-center
                          text-sm"
                      >
                        No models found matching "{modelSearchQuery}"
                      </div>
                    )}
                  </div>
                </SelectContent>
              </Select>

              {/* Show model count for OpenRouter */}
              {selectedProvider.id === 'openrouter' && (
                <p className="text-muted-foreground text-xs">
                  {modelSearchQuery
                    ? `${filteredModels.length} of ${selectedProvider.models.length} models`
                    : `${selectedProvider.models.length} models available`}
                </p>
              )}
            </div>
          )}

          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={localSettings.apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder={
                  localSettings.provider === 'openrouter'
                    ? 'Enter your OpenRouter API key'
                    : `Enter your ${localSettings.provider?.toUpperCase()} API key`
                }
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-full w-10 p-0"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {localSettings.provider === 'openrouter' && (
              <p className="text-muted-foreground text-xs">
                Get your API key from{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  OpenRouter Dashboard
                </a>
              </p>
            )}
          </div>

          {/* Status */}
          <div className="text-sm">
            {isComplete ? (
              <span className="text-green-600">✓ Configuration complete</span>
            ) : (
              <span className="text-muted-foreground">
                Please complete all settings
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={handleClearSettings}
            disabled={!localSettings.provider || !localSettings.apiKey}
          >
            Clear Settings
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              Save Settings
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
