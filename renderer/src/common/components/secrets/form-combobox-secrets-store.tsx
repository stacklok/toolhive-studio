import { ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { FormControl, FormField, FormItem } from '../ui/form'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command'

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
 * NOTE: This component expects that the form has a field named `secrets` which
 * is an array of objects with a `key` & `value` property.
 */
export function FormComboboxSecretStore<T extends FieldValues = FieldValues>({
  form,
  name,
}: {
  form: UseFormReturn<T>
  name: Path<T>
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  type="button"
                  role="combobox"
                  className="rounded-tl-none rounded-bl-none"
                >
                  <ChevronDown />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="min-w-[200px] p-0"
              side="bottom"
            >
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
                        onSelect={(value) => {
                          field.onChange(value)
                        }}
                      >
                        {secret.key}
                        {/* <Check
                    className={cn(
                      'ml-auto',
                      value === secret.value ? 'opacity-100' : 'opacity-0'
                    )}
                  /> */}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </FormItem>
      )}
    />
  )
}
