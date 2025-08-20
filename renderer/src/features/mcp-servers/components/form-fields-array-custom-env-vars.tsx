import {
  Controller,
  type UseFormReturn,
  type Path,
  type ArrayPath,
  type ControllerRenderProps,
} from 'react-hook-form'
import type { FormSchemaRunMcpCommand } from '../lib/form-schema-run-mcp-server-with-command'
import { FormControl, FormField, FormItem } from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { DynamicArrayField } from '@/features/registry-servers/components/dynamic-array-field'

type EnvVar = {
  name?: string
  value?: string
}

export function FormFieldsArrayCustomEnvVars({
  form,
}: {
  form: UseFormReturn<FormSchemaRunMcpCommand>
}) {
  return (
    <FormItem>
      <Controller
        control={form.control}
        name={'envVars' as Path<FormSchemaRunMcpCommand>}
        render={() => (
          <DynamicArrayField<FormSchemaRunMcpCommand>
            name={'envVars' as ArrayPath<FormSchemaRunMcpCommand>}
            label="Environment variables"
            inputLabelPrefix="Environment variable"
            addButtonText="Add environment variable"
            description="Environment variables are used to pass configuration settings to the server."
            gridConfig="grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            columnHeaders={[
              { title: 'Key' },
              { title: 'Value' },
              { title: null },
            ]}
            form={form}
          >
            {({ inputProps, setInputRef, idx }) => (
              <FormField
                control={form.control}
                name={`envVars.${idx}` as Path<FormSchemaRunMcpCommand>}
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<
                    FormSchemaRunMcpCommand,
                    Path<FormSchemaRunMcpCommand>
                  >
                }) => {
                  const envVarValue = field.value as EnvVar

                  return (
                    <>
                      <FormControl className="flex-1">
                        <Input
                          ref={setInputRef(idx)}
                          aria-label={`Environment variable key ${idx + 1}`}
                          className="font-mono"
                          name={
                            `envVars.${idx}.name` as Path<FormSchemaRunMcpCommand>
                          }
                          value={envVarValue?.name || ''}
                          onChange={(e) =>
                            field.onChange({
                              ...envVarValue,
                              name: e.target.value,
                            })
                          }
                          placeholder="e.g. API_KEY"
                        />
                      </FormControl>
                      <FormControl className="flex-1">
                        <Input
                          {...inputProps}
                          ref={setInputRef(idx)}
                          aria-label={`Environment variable value ${idx + 1}`}
                          className="font-mono"
                          name={
                            `envVars.${idx}.value` as Path<FormSchemaRunMcpCommand>
                          }
                          value={envVarValue?.value || ''}
                          onChange={(e) =>
                            field.onChange({
                              ...envVarValue,
                              value: e.target.value,
                            })
                          }
                          placeholder="e.g. 123_ABC_789_XZY"
                        />
                      </FormControl>
                    </>
                  )
                }}
              />
            )}
          </DynamicArrayField>
        )}
      />
    </FormItem>
  )
}
