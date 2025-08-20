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
import { FormComboboxSecretStore } from '@/common/components/secrets/form-combobox-secrets-store'

type SecretFieldValue = {
  name?: string
  value?: { secret?: string; isFromStore: boolean } | string
}

export function FormFieldsArrayCustomSecrets({
  form,
}: {
  form: UseFormReturn<FormSchemaRunMcpCommand>
}) {
  return (
    <FormItem>
      <Controller
        control={form.control}
        name={'secrets' as Path<FormSchemaRunMcpCommand>}
        render={() => (
          <DynamicArrayField<FormSchemaRunMcpCommand>
            name={'secrets' as ArrayPath<FormSchemaRunMcpCommand>}
            label="Secrets"
            inputLabelPrefix="Secret"
            addButtonText="Add secret"
            description="All secrets are encrypted and securely stored by ToolHive."
            gridConfig="grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            columnHeaders={[
              { title: 'Secret name' },
              { title: 'Value' },
              { title: null },
            ]}
            form={form}
          >
            {({ inputProps, setInputRef, idx }) => (
              <FormField
                control={form.control}
                name={`secrets.${idx}` as Path<FormSchemaRunMcpCommand>}
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<
                    FormSchemaRunMcpCommand,
                    Path<FormSchemaRunMcpCommand>
                  >
                }) => {
                  const secretField = field.value as SecretFieldValue
                  const currentValue =
                    secretField?.value &&
                    typeof secretField.value === 'object' &&
                    secretField.value !== null
                      ? secretField.value
                      : { secret: '', isFromStore: false }

                  return (
                    <>
                      <span id={`secrets-${idx}-name-desc`} className="sr-only">
                        {`Secret ${idx + 1} name`}
                      </span>
                      <FormControl className="flex-1">
                        <Input
                          ref={setInputRef(idx)}
                          aria-label={`Secret key`}
                          aria-describedby={`secrets-${idx}-name-desc`}
                          className="font-mono"
                          name={
                            `secrets.${idx}.name` as Path<FormSchemaRunMcpCommand>
                          }
                          value={secretField?.name || ''}
                          onChange={(e) =>
                            field.onChange({
                              ...secretField,
                              name: e.target.value,
                            })
                          }
                          placeholder="e.g. API_KEY"
                        />
                      </FormControl>
                      <span
                        id={`secrets-${idx}-value-desc`}
                        className="sr-only"
                      >
                        {`Secret ${idx + 1} value`}
                      </span>
                      <FormControl className="flex-1">
                        <div
                          className="grid
                            grid-cols-[auto_calc(var(--spacing)_*_9)]"
                        >
                          <Input
                            {...inputProps}
                            ref={setInputRef(idx)}
                            type="password"
                            aria-label={`Secret value`}
                            aria-describedby={`secrets-${idx}-value-desc`}
                            className="rounded-tr-none rounded-br-none
                              border-r-0 font-mono focus-visible:z-10"
                            name={
                              `secrets.${idx}.value` as Path<FormSchemaRunMcpCommand>
                            }
                            value={currentValue?.secret || ''}
                            onChange={(e) =>
                              field.onChange({
                                ...secretField,
                                value: {
                                  secret: e.target.value,
                                  isFromStore: false,
                                },
                              })
                            }
                            placeholder="e.g. 123_ABC_789_XZY"
                          />
                          <FormComboboxSecretStore<FormSchemaRunMcpCommand>
                            form={form}
                            name={
                              `secrets.${idx}.value` as Path<FormSchemaRunMcpCommand>
                            }
                          />
                        </div>
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
