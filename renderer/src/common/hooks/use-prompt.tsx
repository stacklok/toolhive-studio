import React, { useContext, type ReactNode } from 'react'
import { PromptContext, type PromptContextType } from '@/common/contexts/prompt'
import { Input } from '@/common/components/ui/input'
import type { FormikFormPromptConfig } from '@/common/contexts/prompt'
import type { FormikProps } from 'formik'

export function usePrompt() {
  const context = useContext(
    PromptContext as React.Context<PromptContextType | null>
  )
  if (!context) {
    throw new Error('usePrompt must be used within a PromptProvider')
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
      <label
        className="text-sm leading-none font-medium"
        htmlFor="formik-field-value"
      >
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
        aria-describedby={
          formik.errors.value ? 'formik-field-value-message' : undefined
        }
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
