import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../ui/select'
import type { UseFormReturn } from 'react-hook-form'
import { FormField, FormItem, FormControl, FormMessage } from '../../ui/form'
import type { RegistryFormData } from './schema'
import { REGISTRY_TYPE_OPTIONS } from './utils'

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
          <Select
            onValueChange={(value) => {
              field.onChange(value)

              if (value === type) {
                form.setValue('source', source)
              } else {
                form.setValue('source', '')
              }
            }}
            value={field.value}
          >
            <FormControl>
              <SelectTrigger disabled={isPending}>
                <SelectValue placeholder="Select registry type" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {REGISTRY_TYPE_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
