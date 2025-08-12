import { Bot, Key, Settings, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
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
import type { ChatSettings } from '../types'

interface ModelSelectorProps {
  settings: ChatSettings
  onSettingsChange: (settings: ChatSettings) => void
  onOpenSettings: () => void
}

export function ModelSelector({
  settings,
  onSettingsChange,
  onOpenSettings,
}: ModelSelectorProps) {
  const { providersWithApiKeys, isLoading } = useAvailableModels()

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
    onSettingsChange({
      ...settings,
      provider: providerId,
      model: modelId,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[200px] justify-between">
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

        {providersWithApiKeys.map((provider) => (
          <DropdownMenuSub key={provider.id}>
            <DropdownMenuSubTrigger>
              <div className="flex w-full items-center justify-between">
                <span>{provider.name}</span>
                <Badge variant="outline" className="text-xs">
                  {provider.models.length}
                </Badge>
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-80">
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                {provider.name} Models
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {provider.models.map((model) => {
                const isSelected =
                  settings.provider === provider.id && settings.model === model

                return (
                  <DropdownMenuItem
                    key={model}
                    onClick={() => handleModelSelect(provider.id, model)}
                    className="flex cursor-pointer items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="h-4 w-4" />}
                      <span className="font-mono text-sm">{model}</span>
                    </div>
                    <div className="flex gap-1">
                      {(model.includes('gpt-5') ||
                        model.includes('claude-4.1')) && (
                        <Badge variant="default" className="text-xs">
                          Latest
                        </Badge>
                      )}
                      {(model.includes('o1') || model.includes('o3')) && (
                        <Badge variant="secondary" className="text-xs">
                          Reasoning
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          Manage API Keys
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
