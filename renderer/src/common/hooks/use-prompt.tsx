import React, { useContext, type ReactNode } from 'react'
import { PromptContext, type PromptContextType } from '@/common/contexts/prompt'
import { z } from 'zod/v4'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import type { FormPromptConfig } from '@/common/contexts/prompt'

export function usePrompt() {
  const context = useContext(
    PromptContext as React.Context<PromptContextType | null>
  )
  if (!context) {
    throw new Error('usePrompt must be used within a PromptProvider')
  }
  return context.promptForm
}

// Factory function for simple text input prompts
export function generatePromptProps(
  inputType: 'text' | 'email' | 'password' | 'url' = 'text',
  initialValue: string = '',
  options: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    title?: ReactNode
    description?: ReactNode
    placeholder?: string
    label?: ReactNode
    confirmText?: ReactNode
    cancelText?: ReactNode
  } = {}
): FormPromptConfig<z.ZodType<{ value: string }>> {
  // Build the schema based on input type and options
  let valueSchema = z.string()

  // Apply type-specific validation first
  if (inputType === 'email') {
    valueSchema = z.string().email('Please enter a valid email address')
  } else if (inputType === 'url') {
    valueSchema = z.string().url('Please enter a valid URL')
  }

  // Apply additional validations
  if (options.required) {
    valueSchema = valueSchema.min(1, 'This field is required')
  }

  if (options.minLength) {
    valueSchema = valueSchema.min(
      options.minLength,
      `Must be at least ${options.minLength} characters`
    )
  }

  if (options.maxLength) {
    valueSchema = valueSchema.max(
      options.maxLength,
      `Must be no more than ${options.maxLength} characters`
    )
  }

  if (options.pattern) {
    valueSchema = valueSchema.regex(options.pattern, 'Invalid format')
  }

  const schema = z.object({
    value: valueSchema,
  })

  return {
    title: options.title || 'Input Required',
    description: options.description,
    schema,
    defaultValues: {
      value: initialValue,
    },
    renderForm: (form) => (
      <FormField
        control={form.control}
        name="value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{options.label || 'Value'}</FormLabel>
            <FormControl>
              <Input
                type={inputType}
                placeholder={options.placeholder}
                {...field}
                autoFocus
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    ),
    buttons: {
      confirm: options.confirmText || 'OK',
      cancel: options.cancelText || 'Cancel',
    },
  }
}
