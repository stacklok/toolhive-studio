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
import { REGISTRY_INPUT_CONFIG } from './utils'

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
            />
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
