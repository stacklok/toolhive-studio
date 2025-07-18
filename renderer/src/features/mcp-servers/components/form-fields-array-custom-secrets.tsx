import { useFieldArray, type UseFormReturn } from 'react-hook-form'

import { PlusIcon, TrashIcon } from 'lucide-react'
import type { FormSchemaRunMcpCommand } from '../lib/form-schema-run-mcp-server-with-command'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/components/ui/form'
import { TooltipInfoIcon } from '@/common/components/ui/tooltip-info-icon'
import { Input } from '@/common/components/ui/input'
import { Button } from '@/common/components/ui/button'
import { useRef } from 'react'
import { flushSync } from 'react-dom'
import { FormComboboxSecretStore } from '@/common/components/secrets/form-combobox-secrets-store'

export function FormFieldsArrayCustomSecrets({
  form,
}: {
  form: UseFormReturn<FormSchemaRunMcpCommand>
}) {
  const { fields, append, remove } = useFieldArray<FormSchemaRunMcpCommand>({
    control: form.control,
    name: 'secrets',
  })

  const addEnvVarButton = useRef<HTMLButtonElement>(null)

  /**
   * Adds a new environment variable field to the form.
   * Because adding a new field may cause the button to be scrolled out of view,
   * we use `flushSync` to ensure that the button is rendered before we scroll to it.
   */
  const addEnvVar = () => {
    flushSync(() => {
      append({ name: '', value: '' })
    })
    addEnvVarButton.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <FormLabel
          htmlFor={fields.length > 0 ? 'secrets.0.key' : 'add-secret-button'}
        >
          Secrets
        </FormLabel>
        <TooltipInfoIcon>
          All secrets are encrypted and securely stored by ToolHive.
        </TooltipInfoIcon>
      </div>
      {fields.map((field, index) => (
        <div
          className="grid grid-cols-[auto_auto_calc(var(--spacing)_*_9)] gap-2"
          key={field.id}
        >
          <FormField
            control={form.control}
            name={`secrets.${index}.name`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    aria-label="Secret key"
                    defaultValue={field.value}
                    id={`secrets.${index}.name`}
                    name={field.name}
                    className="font-mono"
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="e.g. API_KEY"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-[auto_calc(var(--spacing)_*_9)]">
            <FormField
              control={form.control}
              name={`secrets.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="password"
                      aria-label="Secret value"
                      className="rounded-tr-none rounded-br-none border-r-0
                        font-mono focus-visible:z-10"
                      defaultValue={field.value.secret}
                      name={field.name}
                      onChange={(e) =>
                        field.onChange({
                          secret: e.target.value,
                          isFromStore: false,
                        })
                      }
                      placeholder="e.g. 123_ABC_789_XZY"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormComboboxSecretStore<FormSchemaRunMcpCommand>
              form={form}
              name={`secrets.${index}.value`}
            />
          </div>

          <Button
            aria-label="Remove secret"
            type="button"
            variant="outline"
            onClick={() => remove(index)}
          >
            <TrashIcon />
          </Button>
        </div>
      ))}
      <Button
        id="add-secret-button"
        type="button"
        variant="outline"
        className="w-full"
        aria-label="Add secret"
        ref={addEnvVarButton}
        onClick={() => addEnvVar()}
      >
        <PlusIcon /> Add secret
      </Button>
    </>
  )
}
