import React, { useContext } from 'react'
import { PromptContext, type PromptContextType } from '@/common/contexts/prompt'
import { Input } from '@/common/components/ui/input'
import type { ReactHookFormPromptConfig } from '@/common/contexts/prompt'
import type { UseFormReturn } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'

export function usePrompt() {
  console.log('usePrompt called')
  const context = useContext(
    PromptContext as React.Context<PromptContextType | null>
  )
  console.log('usePrompt context:', context)
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
}: {
  inputType?: 'text' | 'email' | 'password' | 'url'
  initialValue?: string
  title?: string
  description?: React.ReactNode
  placeholder?: string
  label?: string
  validationSchema?: z.ZodSchema<string>
} = {}): ReactHookFormPromptConfig<{ value: string }> {
  console.log('generateSimplePrompt called with:', {
    inputType,
    initialValue,
    title,
  })

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
          <Input
            id="value"
            type={inputType}
            placeholder={placeholder}
            {...form.register('value')}
          />
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
