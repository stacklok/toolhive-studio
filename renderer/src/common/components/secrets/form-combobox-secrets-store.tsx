import { Check, ChevronDown } from 'lucide-react'
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
import { cn } from '@/common/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaSecretsDefaultKeysOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { RefreshButton } from '../refresh-button'

type ConstrainedFieldValues = FieldValues & {
  secrets: {
    name: string
    value: {
      secret?: string | undefined
      isFromStore: boolean
    }
  }[]
}

/**
 * A combobox for selecting a secret from the secret store.
 * NOTE: This component expects that the form has a field named `secrets` which
 * is an array of objects with a `key` & `value` property.
 */
export function FormComboboxSecretStore<
  T extends ConstrainedFieldValues = ConstrainedFieldValues,
>({ form, name }: { form: UseFormReturn<T>; name: Path<T> }) {
  const { data, refetch } = useQuery(getApiV1BetaSecretsDefaultKeysOptions())

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
                  size="icon"
                  className="rounded-tl-none rounded-bl-none"
                  aria-label="Use a secret from the store"
                >
                  <ChevronDown />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="min-w-[200px] p-0"
              side="bottom"
              aria-label="Secrets store"
            >
              <Command>
                <div className="grid w-full grid-cols-[auto_calc(var(--spacing)_*_9)] items-end">
                  <CommandInput
                    placeholder="Search secrets..."
                    className="h-9"
                  />
                  <div
                    className="ml-auto flex size-9 shrink-0 grow-0 items-center justify-center self-end
                      border-b"
                  >
                    <RefreshButton refresh={refetch} className="size-7" />
                  </div>
                </div>
                <CommandList>
                  <CommandEmpty>No secrets found</CommandEmpty>
                  <CommandGroup>
                    {data?.keys?.[0]
                      ? data.keys
                          .sort((a, b) =>
                            (a.key ?? '')?.localeCompare(b.key ?? '')
                          )
                          .map((secret) => (
                            <CommandItem
                              key={secret.key}
                              value={secret.key}
                              className="font-mono"
                              onSelect={(value) => {
                                field.onChange({
                                  secret: value,
                                  isFromStore: true,
                                })
                              }}
                            >
                              {secret.key}
                              <Check
                                className={cn(
                                  'ml-auto',
                                  field.value.secret === secret.key
                                    ? 'opacity-100'
                                    : 'opacity-0'
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
        </FormItem>
      )}
    />
  )
}
