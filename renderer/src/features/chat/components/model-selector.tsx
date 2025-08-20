import { useState } from 'react'
import { Bot, Key, Settings, ChevronDown, Check, Search } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu'
import { Badge } from '@/common/components/ui/badge'
import { useAvailableModels } from '../hooks/use-available-models'
import { getProviderIcon } from './provider-icons'
import type { ChatSettings } from '../types'

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
  onProviderChange,
}: ModelSelectorProps) {
  const { providersWithApiKeys, isLoading } = useAvailableModels()
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({})

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <Bot className="mr-2 h-4 w-4 animate-pulse" />
        Loading models...
      </Button>
    )
  }

  if (providersWithApiKeys.length === 0) {
    return (
      <Button variant="outline" onClick={onOpenSettings}>
        <Key className="mr-2 h-4 w-4" />
        Add API Keys
      </Button>
    )
  }

  const selectedProvider = providersWithApiKeys.find(
    (p) => p.id === settings.provider
  )

  const handleModelSelect = (providerId: string, modelId: string) => {
    // If provider changed, load its API key
    if (providerId !== settings.provider && onProviderChange) {
      onProviderChange(providerId)
    }

    onSettingsChange({
      ...settings,
      provider: providerId,
      model: modelId,
    })
  }

  // Filter models based on search query for each provider
  const getFilteredModels = (provider: { id: string; models: string[] }) => {
    const query = searchQueries[provider.id]?.toLowerCase() || ''
    if (!query) return provider.models

    return provider.models.filter((model: string) =>
      model.toLowerCase().includes(query)
    )
  }

  // Format model name for better display
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 min-w-[320px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            {settings.provider && settings.model ? (
              <span className="font-mono text-sm">
                {selectedProvider?.name}: {settings.model}
              </span>
            ) : (
              <span>Select AI Model</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          AI Models
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {providersWithApiKeys.map((provider) => {
          const filteredModels = getFilteredModels(provider)
          const hasSearch = provider.models.length > 10

          return (
            <DropdownMenuSub key={provider.id}>
              <DropdownMenuSubTrigger>
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getProviderIcon(provider.id)}
                    <span>{provider.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {searchQueries[provider.id]
                      ? filteredModels.length
                      : provider.models.length}
                  </Badge>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                className="flex max-h-[500px] w-80 flex-col overflow-hidden"
              >
                <div className="flex-shrink-0">
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    {provider.name} Models
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Search input for providers with many models */}
                  {hasSearch && (
                    <div className="bg-background border-b p-2">
                      <div className="relative">
                        <Search
                          className="text-muted-foreground absolute top-2.5
                            left-2 h-4 w-4"
                        />
                        <Input
                          placeholder="Search models..."
                          value={searchQueries[provider.id] || ''}
                          onChange={(e) =>
                            setSearchQueries((prev) => ({
                              ...prev,
                              [provider.id]: e.target.value,
                            }))
                          }
                          className="h-8 pl-8"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Models list with scroll */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {filteredModels.length > 0 ? (
                    filteredModels.map((model) => {
                      const isSelected =
                        settings.provider === provider.id &&
                        settings.model === model

                      return (
                        <DropdownMenuItem
                          key={model}
                          onClick={() => handleModelSelect(provider.id, model)}
                          className="flex cursor-pointer items-center
                            justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && <Check className="h-4 w-4" />}
                            <div className="flex flex-col">
                              <span className="font-mono text-sm">
                                {provider.id === 'openrouter'
                                  ? formatModelName(model, provider.id)
                                  : model}
                              </span>
                              {provider.id === 'openrouter' && (
                                <span className="text-muted-foreground text-xs">
                                  {model}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {(model.includes('gpt-5') ||
                              model.includes('claude-4') ||
                              model.includes('gemini-2.5')) && (
                              <Badge variant="default" className="text-xs">
                                Latest
                              </Badge>
                            )}
                            {(model.includes('o1') ||
                              model.includes('o3') ||
                              model.includes('reasoning') ||
                              model.includes('thinking')) && (
                              <Badge variant="secondary" className="text-xs">
                                Reasoning
                              </Badge>
                            )}
                          </div>
                        </DropdownMenuItem>
                      )
                    })
                  ) : (
                    <div
                      className="text-muted-foreground p-2 text-center text-sm"
                    >
                      No models found matching "{searchQueries[provider.id]}"
                    </div>
                  )}
                </div>

                {/* Model count info for providers with search */}
                {hasSearch && (
                  <div className="bg-background flex-shrink-0 border-t p-2">
                    <p className="text-muted-foreground text-center text-xs">
                      {searchQueries[provider.id]
                        ? `${filteredModels.length} of ${provider.models.length} models`
                        : `${provider.models.length} models available`}
                    </p>
                  </div>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          Manage API Keys
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
