import {
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from 'cmdk'
import { CheckIcon, ChevronDown, Command } from 'lucide-react'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { cn } from '@/common/lib/utils'

const MOCK_SECRETS: { key: string }[] = [
  {
    key: 'CONFLUENCE_API_TOKEN',
  },
  {
    key: 'JIRA_API_TOKEN',
  },
  {
    key: 'GITHUB_ACCESS_TOKEN',
  },
  {
    key: 'GITHUB_WEBHOOK_SECRET',
  },
  {
    key: 'AWS_ACCESS_KEY_ID',
  },
]

/**
 * A combobox for selecting a secret from the secret store.
 * NOTE: This is placeholder UI and doesn't actually fetch anything at this point.
 */
export function ComboboxSecretStore({
  onSelect,
  value,
}: {
  onSelect: (value: string) => void
  value: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="rounded-tl-none rounded-bl-none" // NOTE: This is intended to be grouped alongside an input as an extra control
        >
          <ChevronDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="min-w-[200px] p-0" side="bottom">
        <Command>
          <CommandInput placeholder="Search secrets..." className="h-9" />
          <CommandList>
            <CommandEmpty>No secrets found</CommandEmpty>
            <CommandGroup>
              {MOCK_SECRETS.map((secret) => (
                <CommandItem
                  key={secret.key}
                  value={secret.key}
                  className="font-mono"
                  onSelect={onSelect}
                >
                  {secret.key}
                  <CheckIcon
                    className={cn(
                      'ml-auto',
                      value === secret.key ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
