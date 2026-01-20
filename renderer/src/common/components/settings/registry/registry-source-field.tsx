import type { ControllerRenderProps, UseFormReturn } from 'react-hook-form'
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
import { Button } from '../../ui/button'
import type { RegistryInputType } from './utils'

const REGISTRY_INPUT_CONFIG = {
  local_path: {
    label: 'Registry File Path',
    placeholder: '/path/to/registry.json',
    useFilePicker: true,
    description:
      'Provide the absolute path to a local registry JSON file on your system.',
  },
  url: {
    label: 'Registry URL',
    placeholder: 'https://domain.com/registry.json',
    useFilePicker: false,
    description: (
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
    ),
  },
  api_url: {
    label: 'Registry Server API URL',
    placeholder: 'https://domain.com:8080/api/registry',
    useFilePicker: false,
    description: 'Provide the HTTPS URL of a registry server API.',
  },
} as const satisfies Record<
  RegistryInputType,
  {
    label: string
    placeholder: string
    useFilePicker: boolean
    description: React.ReactNode
  }
>

function RegistryFormControl({
  useFilePicker,
  placeholder,
  field,
  disabled,
  hasRegistryError,
}: {
  useFilePicker: boolean
  placeholder: string
  field: ControllerRenderProps<RegistryFormData, 'source'>
  disabled: boolean
  hasRegistryError: boolean
}) {
  if (useFilePicker) {
    return (
      <FormControl>
        <FilePickerInput
          mode="file"
          placeholder={placeholder}
          name={field.name}
          value={field.value ?? ''}
          onChange={({ newValue }) => field.onChange(newValue)}
          disabled={disabled}
        />
      </FormControl>
    )
  }

  return (
    <FormControl>
      <Input
        placeholder={placeholder}
        {...field}
        disabled={disabled}
        aria-invalid={hasRegistryError}
      />
    </FormControl>
  )
}

export function RegistrySourceField({
  isPending,
  form,
  hasRegistryError,
}: {
  isPending: boolean
  form: UseFormReturn<RegistryFormData>
  hasRegistryError: boolean
}) {
  const registryType = form.watch('type')

  if (registryType === 'default') {
    return null
  }

  const sourceType = registryType as keyof typeof REGISTRY_INPUT_CONFIG
  const config = REGISTRY_INPUT_CONFIG[sourceType]

  return (
    <FormField
      control={form.control}
      name="source"
      render={({ field }) => {
        return (
          <FormItem className="w-full">
            <FormLabel required>{config.label}</FormLabel>
            <FormDescription>{config.description}</FormDescription>
            <RegistryFormControl
              useFilePicker={config.useFilePicker}
              placeholder={config.placeholder}
              field={field}
              disabled={isPending}
              hasRegistryError={hasRegistryError}
            />
            {hasRegistryError ? (
              <p className="text-destructive text-sm">
                Failed to load registry configuration. The registry source may
                be misconfigured or unavailable.
              </p>
            ) : (
              <FormMessage />
            )}
          </FormItem>
        )
      }}
    />
  )
}
