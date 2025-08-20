import { useFieldArray, type UseFormReturn, type Path } from 'react-hook-form'

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

export function FormFieldsArrayCustomEnvVars({
  form,
}: {
  form: UseFormReturn<FormSchemaRunMcpCommand>
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'envVars' satisfies Path<FormSchemaRunMcpCommand>,
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
          htmlFor={
            fields.length > 0
              ? `envVars.0.name`
              : 'add-env-var-button'
          }
        >
          Environment variables
        </FormLabel>
        <TooltipInfoIcon>
          Environment variables are used to pass configuration settings to the
          server.
        </TooltipInfoIcon>
      </div>
      {fields.map((field, index) => (
        <div
          className="grid grid-cols-[auto_auto_calc(var(--spacing)_*_9)] gap-2"
          key={field.id}
        >
          <FormField
            control={form.control}
            name={`envVars.${index}.name` satisfies Path<FormSchemaRunMcpCommand>}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    aria-label="Environment variable key"
                    defaultValue={field.value}
                    className="font-mono"
                    id={`envVars.${index}.name`}
                    name={field.name}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="e.g. API_KEY"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`envVars.${index}.value` satisfies Path<FormSchemaRunMcpCommand>}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    aria-label="Environment variable value"
                    defaultValue={field.value}
                    className="font-mono"
                    name={field.name}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="e.g. 123_ABC_789_XZY"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            aria-label="Remove environment variable"
            type="button"
            variant="outline"
            onClick={() => remove(index)}
          >
            <TrashIcon />
          </Button>
        </div>
      ))}
      <Button
        id="add-env-var-button"
        type="button"
        variant="outline"
        className="w-full"
        aria-label="Add environment variable"
        ref={addEnvVarButton}
        onClick={() => addEnvVar()}
      >
        <PlusIcon /> Add environment variable
      </Button>
    </>
  )
}
