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

function renderDescription(type: RegistryFormData['type']) {
  if (type === 'url') {
    return (
      <>
        Provide the HTTPS URL of a remote registry (
        <Button asChild variant="link" size="sm" className="h-auto p-0">
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
    )
  }

  if (type === 'local_path') {
    return 'Provide the absolute path to a local registry JSON file on your system.'
  }

  if (type === 'api_url') {
    return 'Provide the HTTPS URL of a registry server API.'
  }

  return null
}

const REGISTRY_SOURCE_CONFIG = {
  local_path: {
    label: 'Registry File Path',
    placeholder: '/path/to/registry.json',
    useFilePicker: true,
  },
  url: {
    label: 'Registry URL',
    placeholder: 'https://domain.com/registry.json',
    useFilePicker: false,
  },
  api_url: {
    label: 'Registry Server API URL',
    placeholder: 'https://domain.com:8080/api/registry',
    useFilePicker: false,
  },
} as const satisfies Record<
  Exclude<RegistryFormData['type'], 'default'>,
  { label: string; placeholder: string; useFilePicker: boolean }
>

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

  const config =
    REGISTRY_SOURCE_CONFIG[registryType as keyof typeof REGISTRY_SOURCE_CONFIG]

  return (
    <FormField
      control={form.control}
      name="source"
      render={({ field }) => {
        return (
          <FormItem className="w-full">
            <FormLabel required>{config.label}</FormLabel>
            <FormDescription>{renderDescription(registryType)}</FormDescription>
            <FormControl>
              {config.useFilePicker ? (
                <FilePickerInput
                  mode="file"
                  placeholder={config.placeholder}
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={({ newValue }) => field.onChange(newValue)}
                  disabled={isPending}
                />
              ) : (
                <Input
                  placeholder={config.placeholder}
                  {...field}
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
