import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command'
import { cn } from '@/common/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaSecretsDefaultKeysOptions } from '@api/@tanstack/react-query.gen'
import { RefreshButton } from '../refresh-button'
import { delay } from '../../../../../utils/delay'

export function SecretStoreCombobox({
  value,
  onChange,
  buttonAriaLabel = 'Use a secret from the store',
}: {
  value?: string
  onChange: (secretKey: string) => void
  buttonAriaLabel?: string
}) {
  const { data, refetch } = useQuery(getApiV1BetaSecretsDefaultKeysOptions())
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          role="combobox"
          size="icon"
          className="rounded-tl-none rounded-bl-none"
          aria-label={buttonAriaLabel}
        >
          <ChevronDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="min-w-[200px] p-0"
        side="bottom"
        aria-label="Secrets store"
      >
        <Command>
          <div
            className="grid w-full grid-cols-[auto_calc(var(--spacing)_*_9)]
              items-end"
          >
            <CommandInput placeholder="Search secrets..." className="h-9" />
            <div
              className="ml-auto flex size-9 shrink-0 grow-0 items-center
                justify-center self-end border-b"
            >
              <RefreshButton refresh={refetch} className="size-7" />
            </div>
          </div>
          <CommandList>
            <CommandEmpty>No secrets found</CommandEmpty>
            <CommandGroup>
              {data?.keys?.[0]
                ? data.keys
                    .sort((a, b) => (a.key ?? '')?.localeCompare(b.key ?? ''))
                    .map((secret) => (
                      <CommandItem
                        key={secret.key}
                        value={secret.key}
                        className="font-mono"
                        onSelect={async (selected) => {
                          onChange(selected)
                          await delay(150)
                          setIsOpen(false)
                        }}
                      >
                        {secret.key}
                        <Check
                          className={cn(
                            'ml-auto',
                            value === secret.key ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </CommandItem>
                    ))
                : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
