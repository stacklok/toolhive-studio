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
import type { FormPromptConfig, FormikFormPromptConfig } from '@/common/contexts/prompt'
import type { FormikProps } from 'formik'

export function usePrompt() {
  const context = useContext(
    PromptContext as React.Context<PromptContextType | null>
  )
  if (!context) {
    throw new Error('usePrompt must be used within a PromptProvider')
  }
  return context.promptForm
}

export function useFormikPrompt() {
  const context = useContext(
    PromptContext as React.Context<PromptContextType | null>
  )
  if (!context) {
    throw new Error('useFormikPrompt must be used within a PromptProvider')
  }
  return context.promptFormik
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

// Formik helper for a simple single-field text input prompt
export function generateFormikPromptProps(
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
): FormikFormPromptConfig<{ value: string }> {
  const validate = (values: { value: string }) => {
    const errors: Record<string, string> = {}
    const value = values.value ?? ''

    if (options.required && value.trim().length === 0) {
      errors.value = 'This field is required'
      return errors
    }

    if (options.minLength && value.length < options.minLength) {
      errors.value = `Must be at least ${options.minLength} characters`
    }

    if (options.maxLength && value.length > options.maxLength) {
      errors.value = `Must be no more than ${options.maxLength} characters`
    }

    if (options.pattern && !options.pattern.test(value)) {
      errors.value = 'Invalid format'
    }

    if (inputType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (value && !emailRegex.test(value)) {
        errors.value = 'Please enter a valid email address'
      }
    }

    if (inputType === 'url') {
      try {
        if (value) new URL(value)
      } catch {
        errors.value = 'Please enter a valid URL'
      }
    }

    return errors
  }

  const fields = (formik: FormikProps<{ value: string }>) => (
    <div className="grid gap-2">
      <label className="text-sm font-medium leading-none" htmlFor="formik-field-value">
        {options.label || 'Value'}
      </label>
      <Input
        id="formik-field-value"
        type={inputType}
        placeholder={options.placeholder}
        autoFocus
        name="value"
        value={formik.values.value}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        aria-invalid={Boolean(formik.touched.value && formik.errors.value)}
        aria-describedby={formik.errors.value ? 'formik-field-value-message' : undefined}
      />
      {formik.touched.value && formik.errors.value ? (
        <p id="formik-field-value-message" className="text-destructive text-sm">
          {String(formik.errors.value)}
        </p>
      ) : null}
    </div>
  )

  return {
    title: options.title || 'Input Required',
    description: options.description,
    initialValues: { value: initialValue },
    fields,
    validate,
    buttons: {
      confirm: options.confirmText || 'OK',
      cancel: options.cancelText || 'Cancel',
    },
  }
}
