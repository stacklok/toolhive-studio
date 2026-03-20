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
  const { type, source, client_id, issuer_url } = form.formState
    .defaultValues ?? {
    type: 'default',
    source: '',
    client_id: '',
    issuer_url: '',
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
                form.setValue('source', source ?? '')
                if (value === 'api_url') {
                  form.setValue('client_id', client_id ?? '')
                  form.setValue('issuer_url', issuer_url ?? '')
                }
              } else {
                form.setValue('source', '')
                if (value === 'api_url') {
                  form.setValue('client_id', client_id ?? '')
                  form.setValue('issuer_url', issuer_url ?? '')
                } else {
                  form.setValue('client_id', '')
                  form.setValue('issuer_url', '')
                }
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
