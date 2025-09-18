import { useRef, useState } from 'react'
import { Bot, ChevronDown, Check, Search } from 'lucide-react'
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
}: ModelSelectorProps) {
  const { providersWithApiKeys, isLoading } = useAvailableModels()
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const handleModelSelect = (providerId: string, modelId: string) => {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 justify-between"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            {settings.provider && settings.model ? (
              <span className="font-mono text-sm">{settings.model}</span>
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
          const hasSearch = provider.models.length > 50

          return (
            <DropdownMenuSub key={provider.id}>
              <DropdownMenuSubTrigger>
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getProviderIcon(provider.id)}
                    <span>{provider.name}</span>
                  </div>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                className="flex max-h-[480px] w-auto max-w-100 flex-col
                  overflow-hidden px-2"
                onFocus={(e) => {
                  e.preventDefault()
                  inputRef.current?.focus()
                }}
              >
                <div className="flex-shrink-0">
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    {provider.name} Models
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {hasSearch && (
                    <div className="bg-background border-b p-2">
                      <div className="relative">
                        <Search
                          className="text-muted-foreground absolute top-2.5
                            left-2 h-4 w-4"
                        />
                        <Input
                          ref={inputRef}
                          placeholder="Search models..."
                          value={searchQueries[provider.id] || ''}
                          onChange={(e) => {
                            setSearchQueries((prev) => ({
                              ...prev,
                              [provider.id]: e.target.value,
                            }))
                          }}
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
                            <div className="h-4 w-4">
                              {isSelected && <Check className="h-4 w-4" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-mono text-sm">{model}</span>
                            </div>
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
          Manage API Keys
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
