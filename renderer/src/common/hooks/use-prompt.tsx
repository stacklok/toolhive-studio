import React, { useContext } from 'react'
import { PromptContext, type PromptContextType } from '@/common/contexts/prompt'
import { Input } from '@/common/components/ui/input'
import type { ReactHookFormPromptConfig } from '@/common/contexts/prompt'
import type { UseFormReturn } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'

export function usePrompt() {
  const context = useContext(
    PromptContext as React.Context<PromptContextType | null>
  )
  if (!context) {
    throw new Error('usePrompt must be used within a PromptProvider')
  }
  return context.promptForm
}

/**
 * A factory function that generates simple prompt forms using react-hook-form.
 * The generated form can be easily displayed using usePrompt()
 */
export function generateSimplePrompt({
  inputType = 'text',
  initialValue = '',
  title,
  description,
  placeholder,
  label,
  validationSchema,
  options,
}: {
  inputType?: 'text' | 'email' | 'password' | 'url'
  initialValue?: string
  title?: string
  description?: React.ReactNode
  placeholder?: string
  label?: string
  validationSchema?: z.ZodSchema<string>
  options?: Array<{ value: string; label: string }>
} = {}): ReactHookFormPromptConfig<{ value: string }> {
  // Create a schema for the form values
  const formSchema = z.object({
    value: validationSchema || z.string().min(1, 'This field is required'),
  })

  return {
    title: title || 'Input Required',
    description: description,
    defaultValues: { value: initialValue },
    resolver: zodV4Resolver(formSchema),
    fields: (form: UseFormReturn<{ value: string }>) => (
      <div className="space-y-4">
        <div>
          <label htmlFor="value" className="mb-2 block text-sm font-medium">
            {label || 'Value'}
          </label>
          {options ? (
            <Select
              value={form.watch('value')}
              onValueChange={(value) => {
                form.setValue('value', value)
                form.trigger('value')
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={placeholder || 'Select an option...'}
                />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="value"
              type={inputType}
              placeholder={placeholder}
              {...form.register('value')}
            />
          )}
          {form.formState.errors.value && (
            <p className="mt-1 text-sm text-red-500">
              {form.formState.errors.value.message}
            </p>
          )}
        </div>
      </div>
    ),
    buttons: {
      confirm: 'OK',
      cancel: 'Cancel',
    },
  }
}
