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

const EMPTY_REGISTRY_DEFAULTS: RegistryFormData = {
  type: 'default',
  source: '',
  client_id: '',
  issuer_url: '',
}

export function RegistryTypeField({
  isPending,
  form,
}: {
  isPending: boolean
  form: UseFormReturn<RegistryFormData>
}) {
  const defaults = form.formState.defaultValues ?? EMPTY_REGISTRY_DEFAULTS

  function restoreFieldsForType(selectedType: string) {
    const isOriginalType = selectedType === defaults.type
    form.setValue('source', isOriginalType ? (defaults.source ?? '') : '')

    if (selectedType === 'api_url') {
      form.setValue('client_id', defaults.client_id ?? '')
      form.setValue('issuer_url', defaults.issuer_url ?? '')
    } else {
      form.setValue('client_id', '')
      form.setValue('issuer_url', '')
    }
  }

  return (
    <FormField
      control={form.control}
      name="type"
      render={({ field }) => (
        <FormItem className="w-full">
          <Select
            onValueChange={(value) => {
              form.clearErrors()
              field.onChange(value)
              restoreFieldsForType(value)
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
