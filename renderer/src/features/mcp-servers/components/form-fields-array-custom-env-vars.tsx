import {
  Controller,
  type UseFormReturn,
  type Path,
  type ArrayPath,
} from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { DynamicArrayField } from '@/features/registry-servers/components/dynamic-array-field'

type FormWithEnvVars = {
  envVars: Array<{
    name: string
    value: string
  }>
}

export function FormFieldsArrayCustomEnvVars<T extends FormWithEnvVars>({
  form,
}: {
  form: UseFormReturn<T>
}) {
  return (
    <FormItem>
      <Controller
        control={form.control}
        name={'envVars' as Path<T>}
        render={() => (
          <DynamicArrayField<T>
            name={'envVars' as ArrayPath<T>}
            label="Environment variables"
            inputLabelPrefix="Environment variable"
            addButtonText="Add environment variable"
            description="Environment variables are used to pass configuration settings to the server."
            gridConfig="grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            columnHeaders={[
              { title: 'Environment variable name' },
              { title: 'Value' },
              { title: null },
            ]}
            form={form}
          >
            {({ setInputRef, idx }) => (
              <>
                <FormField
                  control={form.control}
                  name={`envVars.${idx}.name` as Path<T>}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          ref={setInputRef(idx)}
                          aria-label={`Environment variable key ${idx + 1}`}
                          className="font-mono"
                          value={(field.value as string) ?? ''}
                          onChange={field.onChange}
                          placeholder="e.g. API_KEY"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`envVars.${idx}.value` as Path<T>}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          ref={setInputRef(idx)}
                          aria-label={`Environment variable value ${idx + 1}`}
                          className="font-mono"
                          value={(field.value as string) ?? ''}
                          onChange={field.onChange}
                          placeholder="e.g. 123_ABC_789_XZY"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </DynamicArrayField>
        )}
      />
    </FormItem>
  )
}
