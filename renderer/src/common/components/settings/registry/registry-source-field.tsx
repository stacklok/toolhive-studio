import type { UseFormReturn } from 'react-hook-form'
import { Button } from '../../ui/button'
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormControl,
  FormMessage,
} from '../../ui/form'
import { Input } from '../../ui/input'
import type { RegistryFormData } from './schema'
import { FilePickerInput } from '../../ui/file-picker-input'

export function RegistrySourceField({
  isPending,
  form,
}: {
  isPending: boolean
  form: UseFormReturn<RegistryFormData>
}) {
  const registryType = form.watch('type')

  if (registryType === 'default') {
    return null
  }

  return (
    <FormField
      control={form.control}
      name="source"
      render={({ field }) => {
        const isRemote = registryType === 'url'

        return (
          <FormItem className="w-full">
            <FormLabel required>
              {isRemote ? 'Registry URL' : 'Registry File Path'}
            </FormLabel>
            <FormDescription>
              {isRemote ? (
                <>
                  Provide the HTTPS url of a remote registry (
                  <Button
                    asChild
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                  >
                    <a
                      href="https://raw.githubusercontent.com/stacklok/toolhive/refs/heads/main/pkg/registry/data/registry.json"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      official ToolHive registry
                    </a>
                  </Button>
                  ).
                </>
              ) : (
                'Provide the absolute path to a local registry JSON file on your system.'
              )}
            </FormDescription>
            <FormControl>
              {isRemote ? (
                <Input
                  placeholder={'https://domain.com/registry.json'}
                  {...field}
                  disabled={isPending}
                />
              ) : (
                <FilePickerInput
                  mode="file"
                  placeholder={'/path/to/registry.json'}
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={({ newValue }) => field.onChange(newValue)}
                  disabled={isPending}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
