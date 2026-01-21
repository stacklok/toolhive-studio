import {
  Controller,
  type UseFormReturn,
  type Path,
  type ArrayPath,
  type ControllerRenderProps,
} from 'react-hook-form'
import type { ChangeEventHandler } from 'react'

import { FormControl, FormField, FormItem } from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { DynamicArrayField } from '@/features/registry-servers/components/dynamic-array-field'
import { SecretStoreCombobox } from '@/common/components/secrets/secret-store-combobox'
import type { SecretFieldValue } from '@/common/types/secrets'

type FormWithSecrets = {
  secrets: Array<SecretFieldValue>
}

export function FormFieldsArrayCustomSecrets<T extends FormWithSecrets>({
  form,
}: {
  form: UseFormReturn<T>
}) {
  return (
    <FormItem>
      <Controller
        control={form.control}
        name={'secrets' as Path<T>}
        render={() => (
          <DynamicArrayField<T>
            name={'secrets' as ArrayPath<T>}
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
            {({
              inputProps,
              setInputRef,
              idx,
            }: {
              inputProps: { id: string; onChange: ChangeEventHandler }
              setInputRef: (
                idx: number
              ) => (el: HTMLInputElement | null) => void
              idx: number
            }) => (
              <FormField
                control={form.control}
                name={`secrets.${idx}` as Path<T>}
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<T, Path<T>>
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
                          name={`secrets.${idx}.name` as Path<T>}
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
                            name={`secrets.${idx}.value` as Path<T>}
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
                          <SecretStoreCombobox
                            value={currentValue?.secret}
                            onChange={(secretKey) =>
                              field.onChange({
                                ...secretField,
                                value: { secret: secretKey, isFromStore: true },
                              })
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
