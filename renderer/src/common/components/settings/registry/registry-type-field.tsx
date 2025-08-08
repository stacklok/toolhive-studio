import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../ui/select'
import type { UseFormReturn } from 'react-hook-form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormControl,
  FormMessage,
} from '../../ui/form'
import type { RegistryFormData } from './schema'

export function RegistryTypeField({
  isPending,
  form,
}: {
  isPending: boolean
  form: UseFormReturn<RegistryFormData>
}) {
  const { type, source } = form.formState.defaultValues ?? {
    type: 'default',
    source: '',
  }

  return (
    <FormField
      control={form.control}
      name="type"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel required>Registry Type</FormLabel>
          <FormDescription>
            Choose between ToolHive default registry, a custom remote registry
            HTTPS url, or a custom local registry file.
          </FormDescription>
          <Select
            onValueChange={(value) => {
              field.onChange(value)

              if (value === type) {
                form.setValue('source', source)
              } else {
                form.setValue('source', '')
              }

              form.trigger('source')
            }}
            value={field.value}
          >
            <FormControl>
              <SelectTrigger disabled={isPending}>
                <SelectValue placeholder="Select registry type" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="default">Default Registry</SelectItem>
              <SelectItem value="url">Remote Registry (URL)</SelectItem>
              <SelectItem value="file">Local Registry (File Path)</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
