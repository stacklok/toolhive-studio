import type { ControllerRenderProps, UseFormReturn } from 'react-hook-form'
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
import { REGISTRY_INPUT_CONFIG } from './utils'

const REGISTRY_SOURCE_DESCRIPTION = {
  local_path:
    'Provide the absolute path to a local registry JSON file on your system.',
  url: (
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
  api_url: 'Provide the HTTPS URL of a registry server API.',
} as const satisfies Record<keyof typeof REGISTRY_INPUT_CONFIG, React.ReactNode>

function RegistryFormControl({
  useFilePicker,
  placeholder,
  field,
  disabled,
}: {
  useFilePicker: boolean
  placeholder: string
  field: ControllerRenderProps<RegistryFormData, 'source'>
  disabled: boolean
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
      <Input placeholder={placeholder} {...field} disabled={disabled} />
    </FormControl>
  )
}

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

  const sourceType = registryType as keyof typeof REGISTRY_INPUT_CONFIG
  const config = REGISTRY_INPUT_CONFIG[sourceType]
  const description = REGISTRY_SOURCE_DESCRIPTION[sourceType]

  return (
    <FormField
      control={form.control}
      name="source"
      render={({ field }) => {
        return (
          <FormItem className="w-full">
            <FormLabel required>{config.label}</FormLabel>
            <FormDescription>{description}</FormDescription>
            <RegistryFormControl
              useFilePicker={config.useFilePicker}
              placeholder={config.placeholder}
              field={field}
              disabled={isPending}
            />
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
