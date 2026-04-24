import { useRef, useState } from 'react'
import { Bot, ChevronDown, Check, Search, X } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { cn } from '@/common/lib/utils'
import { useAvailableModels } from '../hooks/use-available-models'
import { getProviderIcon } from './provider-icons'

export interface ModelSelection {
  provider: string
  model: string
}

interface ModelPickerProps {
  value: ModelSelection | null
  onChange: (next: ModelSelection) => void
  onOpenSettings?: () => void
  onClear?: () => void
  clearLabel?: string
  placeholder?: string
  triggerClassName?: string
  contentClassName?: string
  'data-testid'?: string
}

export function ModelPicker({
  value,
  onChange,
  onOpenSettings,
  onClear,
  clearLabel = 'No default model',
  placeholder = 'Select AI Model',
  triggerClassName,
  contentClassName,
  'data-testid': dataTestId = 'model-selector',
}: ModelPickerProps) {
  const { providersWithCredentials, isLoading } = useAvailableModels()
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

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
          variant="ghost"
          className={cn(
            'h-8 justify-between gap-1 px-2 has-[>svg]:px-2',
            triggerClassName
          )}
          disabled={isLoading}
          data-testid={dataTestId}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {value?.provider && getProviderIcon(value.provider)}
            {value?.provider && value.model ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="max-w-48 truncate text-sm">
                    {value.model}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{value.model}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className={cn('w-80', contentClassName)}
      >
        <DropdownMenuLabel className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          AI Models
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {onClear && value && (
          <>
            <DropdownMenuItem
              onClick={onClear}
              className="text-muted-foreground cursor-pointer"
            >
              <X className="mr-2 h-4 w-4" />
              {clearLabel}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {providersWithCredentials.map((provider) => {
          const filteredModels = getFilteredModels(provider)
          const hasSearch = provider.models.length > 50

          return (
            <DropdownMenuSub key={provider.id}>
              <DropdownMenuSubTrigger>
                <div className="flex w-full items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    {getProviderIcon(provider.id)}
                    <span className="max-w-40 truncate" title={provider.name}>
                      {provider.name}
                    </span>
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
                <div className="shrink-0">
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

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {filteredModels.length > 0 ? (
                    filteredModels.map((model) => {
                      const isSelected =
                        value?.provider === provider.id && value.model === model

                      return (
                        <DropdownMenuItem
                          key={model}
                          onClick={() =>
                            onChange({ provider: provider.id, model })
                          }
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
                      {provider.models.length === 0
                        ? provider.id === 'ollama'
                          ? 'Ollama is not running or no models available'
                          : 'No models available'
                        : `No models found matching "${searchQueries[provider.id]}"`}
                    </div>
                  )}
                </div>

                {hasSearch && (
                  <div className="bg-background shrink-0 border-t p-2">
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

        {onOpenSettings && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onOpenSettings}
              className="cursor-pointer"
            >
              Provider Settings
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
